import BaseIntegrationTest from "./BaseIntegrationTest";
import {
    Comment,
    CommentThread,
    Concept,
    CustomFilter,
    Encounter,
    EntityApprovalStatus,
    Individual,
    ProgramEncounter,
    ProgramEnrolment,
    ReportCard,
    StandardReportCardType,
    Task,
    TaskStatus,
    TaskType
} from "openchs-models";
import TestSubjectFactory from "../test/model/txn/TestSubjectFactory";
import TestObsFactory from "../test/model/TestObsFactory";
import ReportCardService from "../src/service/customDashboard/ReportCardService";
import TestStandardReportCardTypeFactory from "../test/model/reportNDashboard/TestStandardReportCardTypeFactory";
import TestReportCardFactory from "../test/model/reportNDashboard/TestReportCardFactory";
import TestDashboardReportFilterFactory from "../test/model/reportNDashboard/TestDashboardReportFilterFactory";
import {assert} from "chai";
import General from "../src/utility/General";
import TestEntityApprovalStatusFactory from "../test/model/approval/TestEntityApprovalStatusFactory";
import TestEncounterFactory from "../test/model/txn/TestEncounterFactory";
import moment from "moment";
import TestProgramEnrolmentFactory from '../test/model/txn/TestProgramEnrolmentFactory';
import TestProgramEncounterFactory from '../test/model/txn/TestProgramEncounterFactory';
import TestChecklistService from "./service/TestChecklistService";
import TestOrganisationService from "./service/TestOrganisationService";
import TestConceptFactory from "../test/model/TestConceptFactory";
import TestMetadataService from "./service/TestMetadataService";
import TestCommentFactory from "../test/model/comment/TestCommentFactory";
import TestCommentThreadFactory from "../test/model/comment/TestCommentThreadFactory";
import TestTaskTypeFactory from "../test/model/TestTaskTypeFactory";
import TestTaskFactory from "../test/model/TestTaskFactory";
import TestTaskStatusFactory from "../test/model/TestTaskStatusFactory";
import TaskService from "../src/service/task/TaskService";
import TaskFilter from "../src/model/TaskFilter";

function getCount(test, card, reportFilters) {
    let reportCardCount = test.reportCardService.getReportCardCount(card, reportFilters);
    return reportCardCount.primaryValue;
}

class ReportCardServiceIntegrationTest extends BaseIntegrationTest {
    setup() {
        super.setup();
        this.executeInWrite((db) => {
            this.organisationData = TestOrganisationService.setupOrganisation(db);
            this.concept = db.create(Concept, TestConceptFactory.createWithDefaults({dataType: Concept.dataType.Text}));
            this.metadata = TestMetadataService.create(db);

            const subject1Id = General.randomUUID();
            const subject2Id = General.randomUUID();
            const encounterId1 = General.randomUUID();
            const encounterId2 = General.randomUUID();
            const programEnrolmentId1 = General.randomUUID();
            const programEnrolmentId2 = General.randomUUID();
            const programEncounterId1 = General.randomUUID();
            const programEncounterId2 = General.randomUUID();

            const subject1EAS = db.create(EntityApprovalStatus, TestEntityApprovalStatusFactory.create({
                entityType: EntityApprovalStatus.entityType.Subject,
                entityUUID: subject1Id,
                entityTypeUuid: this.metadata.subjectType.uuid,
                approvalStatus: this.metadata.approvedStatus
            }));
            const encEAS = db.create(EntityApprovalStatus, TestEntityApprovalStatusFactory.create({
                entityType: EntityApprovalStatus.entityType.Encounter,
                entityUUID: encounterId1,
                entityTypeUuid: this.metadata.encounterType.uuid,
                approvalStatus: this.metadata.pendingStatus
            }));
            this.subject1 = db.create(Individual, TestSubjectFactory.createWithDefaults({
                uuid: subject1Id,
                subjectType: this.metadata.subjectType,
                address: this.organisationData.addressLevel,
                firstName: "foo",
                lastName: "bar",
                observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("ABC"))})],
                approvalStatuses: [subject1EAS]
            }));

            this.subject1.addEncounter(db.create(Encounter, TestEncounterFactory.create({
                uuid: encounterId1,
                earliestVisitDateTime: moment().add(-2, "day").toDate(),
                maxVisitDateTime: moment().add(2, "day").toDate(),
                encounterType: this.metadata.encounterType,
                approvalStatuses: [encEAS],
                latestEntityApprovalStatus: null,
                subject: this.subject1
            })));

            this.subject1.addEncounter(db.create(Encounter, TestEncounterFactory.create({
                uuid: encounterId2,
                earliestVisitDateTime: moment().add(-10, "day").toDate(),
                maxVisitDateTime: moment().add(-5, "day").toDate(),
                encounterType: this.metadata.encounterType,
                approvalStatuses: [],
                latestEntityApprovalStatus: null,
                subject: this.subject1
            })));

            const programEnrolment1 = db.create(ProgramEnrolment, TestProgramEnrolmentFactory.create({
                uuid: programEnrolmentId1,
                program: this.metadata.program,
                subject: this.subject1,
                enrolmentDateTime: moment().toDate(),
                latestEntityApprovalStatus: null,
                observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("ABCPRG"))})],
                approvalStatuses: []
            }));

            TestChecklistService.createChecklist(programEnrolment1, db);

            const subject2EAS = db.create(EntityApprovalStatus, TestEntityApprovalStatusFactory.create({
                entityType: EntityApprovalStatus.entityType.Subject,
                entityUUID: subject2Id,
                entityTypeUuid: this.metadata.subjectType.uuid,
                approvalStatus: this.metadata.pendingStatus
            }));
            const subject2 = db.create(Individual, TestSubjectFactory.createWithDefaults({
                uuid: subject2Id,
                subjectType: this.metadata.subjectType,
                address: this.organisationData.addressLevel2,
                firstName: "foo2",
                lastName: "bar2",
                observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("DEF"))})],
                approvalStatuses: [subject2EAS]
            }));

            const enrolmentEAS = db.create(EntityApprovalStatus, TestEntityApprovalStatusFactory.create({
                entityType: EntityApprovalStatus.entityType.ProgramEnrolment,
                entityUUID: programEnrolmentId2,
                entityTypeUuid: this.metadata.program.uuid,
                approvalStatus: this.metadata.approvedStatus
            }));
            const programEnc2EAS = db.create(EntityApprovalStatus, TestEntityApprovalStatusFactory.create({
                entityType: EntityApprovalStatus.entityType.ProgramEncounter,
                entityUUID: programEncounterId2,
                entityTypeUuid: this.metadata.programEncounterType.uuid,
                approvalStatus: this.metadata.rejectedStatus
            }));

            const programEnrolment2 = db.create(ProgramEnrolment, TestProgramEnrolmentFactory.create({
                uuid: programEnrolmentId2,
                program: this.metadata.program,
                subject: subject2,
                enrolmentDateTime: moment().add(-10, "day").toDate(),
                latestEntityApprovalStatus: null,
                observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("DEFPRG"))})],
                approvalStatuses: [enrolmentEAS]
            }));

            TestChecklistService.createChecklist(programEnrolment2, db, false);

            programEnrolment2.addEncounter(db.create(ProgramEncounter, TestProgramEncounterFactory.create({
                uuid: programEncounterId1,
                encounterDateTime: moment().add(-2, "day").toDate(),
                earliestVisitDateTime: moment().add(-10, "day").toDate(),
                maxVisitDateTime: moment().add(-5, "day").toDate(),
                encounterType: this.metadata.programEncounterType,
                programEnrolment: programEnrolment2,
                approvalStatuses: [],
                latestEntityApprovalStatus: null
            })));

            programEnrolment2.addEncounter(db.create(ProgramEncounter, TestProgramEncounterFactory.create({
                uuid: programEncounterId2,
                encounterDateTime: moment().toDate(),
                earliestVisitDateTime: moment().add(-2, "day").toDate(),
                maxVisitDateTime: moment().add(2, "day").toDate(),
                encounterType: this.metadata.programEncounterType,
                programEnrolment: programEnrolment2,
                approvalStatuses: [programEnc2EAS],
                latestEntityApprovalStatus: programEnc2EAS
            })));

            const approvedCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.types.Approved}));
            const pendingCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.types.PendingApproval}));
            const scheduledVisitsCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.types.ScheduledVisits}));
            const overdueVisitsCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.types.OverdueVisits}));
            const recentVisitsCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.types.RecentVisits}));
            const recentRegistrationsCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.types.RecentRegistrations}));
            const recentEnrolmentsCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.types.RecentEnrolments}));
            const totalCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.types.Total}));
            const dueChecklistCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.types.DueChecklist}));
            this.approvedCard = db.create(ReportCard, TestReportCardFactory.create({name: "approvedCard", standardReportCardType: approvedCardType}));
            this.pendingCard = db.create(ReportCard, TestReportCardFactory.create({name: "pendingCard", standardReportCardType: pendingCardType}));
            this.scheduledVisitsCard = db.create(ReportCard, TestReportCardFactory.create({
                name: "scheduledVisitsCard",
                standardReportCardType: scheduledVisitsCardType
            }));
            this.overdueVisitsCard = db.create(ReportCard, TestReportCardFactory.create({name: "overdueVisitsCard", standardReportCardType: overdueVisitsCardType}));
            this.recentVisitsCard = db.create(ReportCard, TestReportCardFactory.create({name: "recentVisitsCard", standardReportCardType: recentVisitsCardType}));
            this.recentRegistrationsCard = db.create(ReportCard, TestReportCardFactory.create({
                name: "recentRegistrationsCard",
                standardReportCardType: recentRegistrationsCardType
            }));
            this.recentEnrolmentsCard = db.create(ReportCard, TestReportCardFactory.create({
                name: "recentEnrolmentsCard",
                standardReportCardType: recentEnrolmentsCardType
            }));
            this.totalCard = db.create(ReportCard, TestReportCardFactory.create({name: "totalCard", standardReportCardType: totalCardType}));
            this.dueChecklistCard = db.create(ReportCard, TestReportCardFactory.create({name: "dueChecklistCard", standardReportCardType: dueChecklistCardType}));
        });

        this.reportCardService = this.getService(ReportCardService);
        this.addressSelected = TestDashboardReportFilterFactory.create({type: CustomFilter.type.Address, filterValue: [this.organisationData.addressLevel]});
        this.address2Selected = TestDashboardReportFilterFactory.create({type: CustomFilter.type.Address, filterValue: [this.organisationData.addressLevel2]});
        this.twoAddressSelected = TestDashboardReportFilterFactory.create({
            type: CustomFilter.type.Address,
            filterValue: [this.organisationData.addressLevel, this.organisationData.addressLevel2]
        });
    }

    getCountForCommentCardType() {
        let commentCard;
        this.executeInWrite((db) => {
            const commentCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.types.Comments}));
            commentCard = db.create(ReportCard, TestReportCardFactory.create({name: "dueChecklistCard", standardReportCardType: commentCardType}));

            const commentThread = db.create(CommentThread, TestCommentThreadFactory.create({}));
            const comment = db.create(Comment, TestCommentFactory.create({commentThread: commentThread, subject: this.subject1}));
        });
        assert.equal(1, getCount(this, commentCard, []));
        assert.equal(1, getCount(this, commentCard, [this.addressSelected]));
        assert.equal(0, getCount(this, commentCard, [this.address2Selected]));
    }

    getCountForTaskCardType() {
        let callTaskTypeCard, openSubjectTaskTypeCard;
        this.executeInWrite((db) => {
            const callTaskCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.types.CallTasks}));
            const openSubjectTaskCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.types.OpenSubjectTasks}));
            callTaskTypeCard = db.create(ReportCard, TestReportCardFactory.create({name: "callTaskTypeCard", standardReportCardType: callTaskCardType}));
            openSubjectTaskTypeCard = db.create(ReportCard, TestReportCardFactory.create({name: "callTaskTypeCard", standardReportCardType: openSubjectTaskCardType}));
            const callTaskType = db.create(TaskType, TestTaskTypeFactory.create({type: TaskType.TaskTypeName.Call}));
            const openSubjectTaskType = db.create(TaskType, TestTaskTypeFactory.create({type: TaskType.TaskTypeName.OpenSubject}));
            const callTaskStatus = db.create(TaskStatus, TestTaskStatusFactory.create({taskType: callTaskType}));
            const openSubjectTaskStatus = db.create(TaskStatus, TestTaskStatusFactory.create({taskType: openSubjectTaskType}));
            db.create(Task, TestTaskFactory.create({taskType: callTaskType, taskStatus: callTaskStatus, subject: this.subject1}));
            db.create(Task, TestTaskFactory.create({taskType: openSubjectTaskType, taskStatus: openSubjectTaskStatus, subject: this.subject1}));
        });
        assert.equal(1, getCount(this, callTaskTypeCard, []));
        assert.equal(1, getCount(this, callTaskTypeCard, [this.addressSelected]));
        assert.equal(0, getCount(this, callTaskTypeCard, [this.address2Selected]));
        assert.equal(1, getCount(this, openSubjectTaskTypeCard, []));
        assert.equal(1, getCount(this, openSubjectTaskTypeCard, [this.addressSelected]));
        assert.equal(0, getCount(this, openSubjectTaskTypeCard, [this.address2Selected]));

        const taskService = this.getService(TaskService);
        const taskFilter = TaskFilter.createNoCriteriaFilter(TaskType.TaskTypeName.Call);
        assert.equal(1, taskService.getFilteredTasks(taskFilter, []).length);
        assert.equal(1, taskService.getFilteredTasks(taskFilter, [this.addressSelected]).length);
        assert.equal(0, taskService.getFilteredTasks(taskFilter, [this.address2Selected]).length);
    }

    getResultForApprovalCardsType() {
        assert.equal(2, getCount(this, this.approvedCard, []));
        assert.equal(1, getCount(this, this.approvedCard, [this.addressSelected]));
        assert.equal(1, getCount(this, this.approvedCard, [this.address2Selected]));
        assert.equal(2, getCount(this, this.approvedCard, [this.twoAddressSelected]));
    }

    getResultForPendingCardsType() {
        assert.equal(1, getCount(this, this.pendingCard, []));
        assert.equal(0, getCount(this, this.pendingCard, [this.addressSelected]));
        assert.equal(1, getCount(this, this.pendingCard, [this.address2Selected]));
        assert.equal(1, getCount(this, this.pendingCard, [this.twoAddressSelected]));
    }

    getCountForDefaultCardsType_forScheduledVisits() {
        assert.equal(1, getCount(this, this.scheduledVisitsCard, []));
        assert.equal(1, getCount(this, this.scheduledVisitsCard, [this.addressSelected]));
        assert.equal(0, getCount(this, this.scheduledVisitsCard, [this.address2Selected]));
        assert.equal(1, getCount(this, this.scheduledVisitsCard, [this.twoAddressSelected]));
    }

    getCountForDefaultCardsType_forOverdueVisits() {
        assert.equal(1, getCount(this, this.overdueVisitsCard, []));
        assert.equal(1, getCount(this, this.overdueVisitsCard, [this.addressSelected]));
        assert.equal(0, getCount(this, this.overdueVisitsCard, [this.address2Selected]));
        assert.equal(1, getCount(this, this.overdueVisitsCard, [this.twoAddressSelected]));
    }

    getCountForDefaultCardsType_forRecentVisits() {
        assert.equal(1, getCount(this, this.recentVisitsCard, []));
        assert.equal(0, getCount(this, this.recentVisitsCard, [this.addressSelected]));
        assert.equal(1, getCount(this, this.recentVisitsCard, [this.address2Selected]));
        assert.equal(1, getCount(this, this.recentVisitsCard, [this.twoAddressSelected]));
    }

    getCountForDefaultCardsType_forRecentRegistrations() {
        assert.equal(2, getCount(this, this.recentRegistrationsCard, []));
        assert.equal(1, getCount(this, this.recentRegistrationsCard, [this.addressSelected]));
        assert.equal(1, getCount(this, this.recentRegistrationsCard, [this.address2Selected]));
        assert.equal(2, getCount(this, this.recentRegistrationsCard, [this.twoAddressSelected]));
    }

    getCountForDefaultCardsType_forRecentEnrolments() {
        assert.equal(1, getCount(this, this.recentEnrolmentsCard, []));
        assert.equal(1, getCount(this, this.recentEnrolmentsCard, [this.addressSelected]));
        assert.equal(0, getCount(this, this.recentEnrolmentsCard, [this.address2Selected]));
        assert.equal(1, getCount(this, this.recentEnrolmentsCard, [this.twoAddressSelected]));
    }

    getCountForDefaultCardsType_forTotal() {
        assert.equal(2, getCount(this, this.totalCard, []));
        assert.equal(1, getCount(this, this.totalCard, [this.addressSelected]));
        assert.equal(1, getCount(this, this.totalCard, [this.address2Selected]));
        assert.equal(2, getCount(this, this.totalCard, [this.twoAddressSelected]));
    }

    getCountForDefaultCardsType_forDueChecklist() {
        assert.equal(1, getCount(this, this.dueChecklistCard, []));
        assert.equal(1, getCount(this, this.dueChecklistCard, [this.addressSelected]));
        assert.equal(0, getCount(this, this.dueChecklistCard, [this.address2Selected]));
        assert.equal(1, getCount(this, this.dueChecklistCard, [this.twoAddressSelected]));
    }
}

export default ReportCardServiceIntegrationTest;
