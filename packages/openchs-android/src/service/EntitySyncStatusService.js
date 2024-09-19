import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {
    Checklist,
    ChecklistItem,
    Encounter,
    EntityMetaData,
    EntitySyncStatus,
    GroupSubject,
    Individual,
    IndividualRelationship,
    ProgramEncounter,
    ProgramEnrolment
} from 'openchs-models';
import General from '../utility/General';
import _ from "lodash";
import EntityQueueService from "./EntityQueueService";
import moment from "moment";
import MediaQueueService from "./MediaQueueService";
import PrivilegeService from "./PrivilegeService";
import FormMappingService from "./FormMappingService";
import ChecklistService from "./ChecklistService";

@Service("entitySyncStatusService")
class EntitySyncStatusService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
        this.get = this.get.bind(this);
    }

    findAll() {
        return super.findAll(this.getSchema());
    }

    getSchema() {
        return EntitySyncStatus.schema.name;
    }

    get(entityName, entityTypeUuid) {
        return this.db.objects(EntitySyncStatus.schema.name)
            .filtered("entityName = $0", entityName)
            .filtered(_.isEmpty(entityTypeUuid) ? 'uuid<>null' : 'entityTypeUuid = $0', entityTypeUuid)
            .slice()[0];
    }

    getAllByEntityName(entityName, entityTypeUuid) {
        return this.db.objects(EntitySyncStatus.schema.name)
            .filtered("entityName = $0", entityName)
            .filtered(_.isEmpty(entityTypeUuid) ? 'uuid<>null' : 'entityTypeUuid = $0', entityTypeUuid);
    }

    findAllByUniqueEntityName() {
        return this.findAll().filtered(`TRUEPREDICATE DISTINCT(entityName)`);
    }

    geAllSyncStatus() {
        const entityQueueService = this.getService(EntityQueueService);
        const entities = _.map(this.findAllByUniqueEntityName(), ({entityName, loadedSince}) => {
            const isNeverSynced = loadedSince.getTime() === EntitySyncStatus.REALLY_OLD_DATE.getTime();
            const queuedItemCount = entityQueueService.getQueuedItemCount(entityName);
            const emd = EntityMetaData.findByName(entityName);
            return {
                entityName: entityName,
                loadedSince: isNeverSynced ? 'Never or Not Applicable' : moment(loadedSince).format("DD-MM-YYYY HH:MM:SS"),
                queuedCount: queuedItemCount,
                type: emd && emd.type
            }
        });
        const mediaQueueService = this.getService(MediaQueueService);
        const mediaGroups = _.groupBy(mediaQueueService.findAll(), 'type');
        const mediaEntities = _.map(mediaGroups, (list, mediaType) => ({
            entityName: 'Media ' + mediaType,
            loadedSince: '',
            queuedCount: list.length,
            type: 'tx'
        }));

        return _.concat(entities, mediaEntities);
    }

    getLastLoaded() {
        return moment(_.max(this.findAll(EntitySyncStatus.schema.name)
            .map((entitySyncStatus) => entitySyncStatus.loadedSince))).format("DD-MM-YYYY HH:MM:SS");
    }

    setup() {
        const entityMetaDataModel = EntityMetaData.getEntitiesToBePulled();
        const self = this;

        entityMetaDataModel.forEach(function (entity) {
            if (_.isNil(self.get(entity.entityName)) && _.isEmpty(entity.privilegeParam)) {
                General.logDebug('EntitySyncStatusService', `Setting up base entity sync status for ${entity.entityName}`);
                try {
                    const entitySyncStatus = EntitySyncStatus.create(entity.entityName, EntitySyncStatus.REALLY_OLD_DATE, General.randomUUID(), '');
                    self.save(entitySyncStatus);
                } catch (e) {
                    General.logError('EntitySyncStatusService', `${entity.entityName} failed`);
                    throw e;
                }
            }
        });
    }

    updateAsPerSyncDetails(entitySyncStatuses) {
        _.forEach(entitySyncStatuses, ({uuid, entityName, loadedSince, entityTypeUuid}) => {
            const entitySyncStatus = EntitySyncStatus.create(entityName, loadedSince, uuid, entityTypeUuid);
            this.saveOrUpdate(entitySyncStatus);
        })
    }

    removeRevokedPrivileges(entityMetaDataModel, syncDetails) {
        const hasAllPrivileges = this.getService(PrivilegeService).hasAllPrivileges();
        if (hasAllPrivileges) return [...syncDetails];

        const privilegeEntities = entityMetaDataModel.filter(entity => entity.privilegeParam);
        const syncDetailsWithPrivilege = [...syncDetails];
        privilegeEntities.forEach(entity => {
            const {privilegeEntity, privilegeName, privilegeParam} = entity;
            const revokedEntityTypeUuids = this.getService(PrivilegeService).getRevokedEntityTypeUuidList(privilegeEntity, privilegeName, privilegeParam);
            this.deleteRevokedEntries(entity, revokedEntityTypeUuids);
            _.remove(syncDetailsWithPrivilege, (x) => x.entityName === entity.entityName && _.some(revokedEntityTypeUuids, (y) => y === x.entityTypeUuid))
        })
        return syncDetailsWithPrivilege;
    }

    deleteEntries(criteriaQuery) {
        const db = this.db;
        db.write(() => {
            const objects = this.findAllByCriteria(criteriaQuery);
            db.delete(objects);
        });
    }

    getQueryForChecklist(uuids, queryParam) {
        const query = uuids.map(uuid => `${queryParam} = '${uuid}'`).join(' OR ');
        return _.isEmpty(uuids) ? 'uuid = null' : `(${query})`
    }

    getQueryForQueryParam(uuids, queryParam) {
        const query = uuids.map(uuid => `${queryParam} = '${uuid}'`).join(' OR ');
        return _.isEmpty(uuids) ? 'uuid = null' : `voided = false AND (${query})`
    }

    formMapping(uuids, query) {
        return this.getService(FormMappingService).formMappingByCriteria(this.getQueryForQueryParam(uuids, query))
    }

    checklistDetail(uuids, query) {
        return this.getService(ChecklistService).checklistByCriteria(this.getQueryForChecklist(uuids, query)).map(c => c.detail).filter(Boolean);
    }

    deleteRevokedEntries(entity, revokedPrivilegeUUIDs) {
        switch (entity.entityName) {
            case 'Individual': {
                const requiredFormMapping = this.formMapping(revokedPrivilegeUUIDs, 'subjectType.uuid');
                const encounterUUIDsForNonPrivilegedSubjects = requiredFormMapping.map(fm => fm.observationsTypeEntityUUID);
                const programUUIDsForNonPrivilegedSubjects = requiredFormMapping.map(fm => fm.entityUUID);
                const checklistDetailUUIDs = this.checklistDetail(revokedPrivilegeUUIDs, `programEnrolment.individual.subjectType.uuid`).map(cd => cd.uuid);
                this.resetSync(Individual.schema.name, revokedPrivilegeUUIDs);
                this.resetSync(ProgramEnrolment.schema.name, programUUIDsForNonPrivilegedSubjects);
                this.resetSync(Encounter.schema.name, encounterUUIDsForNonPrivilegedSubjects);
                this.resetSync(IndividualRelationship.schema.name, revokedPrivilegeUUIDs);
                this.resetSync(ProgramEncounter.schema.name, encounterUUIDsForNonPrivilegedSubjects);
                this.resetSync(ChecklistItem.schema.name, checklistDetailUUIDs);
                this.resetSync(Checklist.schema.name, checklistDetailUUIDs);
                this.resetSync(GroupSubject.schema.name, revokedPrivilegeUUIDs);
                break;
            }
            case 'ProgramEnrolment': {
                const requiredFormMapping = this.formMapping(revokedPrivilegeUUIDs, 'entityUUID');
                const programEncounterUUIDs = requiredFormMapping.map(fm => fm.observationsTypeEntityUUID);
                const checklistDetailUUIDs = this.checklistDetail(revokedPrivilegeUUIDs, `programEnrolment.program.uuid`).map(cd => cd.uuid);
                this.resetSync(ProgramEnrolment.schema.name, revokedPrivilegeUUIDs);
                this.resetSync(ProgramEncounter.schema.name, programEncounterUUIDs);
                this.resetSync(ChecklistItem.schema.name, checklistDetailUUIDs);
                this.resetSync(Checklist.schema.name, checklistDetailUUIDs);
                break;
            }
            case 'ProgramEncounter': {
                this.resetSync(ProgramEncounter.schema.name, revokedPrivilegeUUIDs);
                break;
            }
            case 'Encounter': {
                this.resetSync(Encounter.schema.name, revokedPrivilegeUUIDs);
                break;
            }
            case 'Checklist': {
                this.resetSync(ChecklistItem.schema.name, revokedPrivilegeUUIDs);
                this.resetSync(Checklist.schema.name, revokedPrivilegeUUIDs);
                break;
            }
            case 'ChecklistItem': {
                this.resetSync(ChecklistItem.schema.name, revokedPrivilegeUUIDs);
                break;
            }
            case 'IndividualRelationship': {
                this.resetSync(IndividualRelationship.schema.name, revokedPrivilegeUUIDs);
                break;
            }
            case 'GroupSubject': {
                this.resetSync(GroupSubject.schema.name, revokedPrivilegeUUIDs);
                break;
            }
            case 'SubjectEntityApprovalStatus':
            case 'EncounterEntityApprovalStatus':
            case 'ProgramEncounterEntityApprovalStatus':
            case 'ProgramEnrolmentEntityApprovalStatus':
            case 'ChecklistItemEntityApprovalStatus':
                this.resetSync(entity.entityName, revokedPrivilegeUUIDs);
        }
    }

    resetSync(entityName, nonPrivilegeUuids) {
        const query = nonPrivilegeUuids.map(uuid => `entityTypeUuid = '${uuid}'`).join(' OR ');
        const criteria = _.isEmpty(query) ? `entityTypeUuid = ''` : `( entityTypeUuid = '' OR ${query})`;
        this.deleteEntries(`entityName = '${entityName}' && ${criteria}`)
    }

    getTotalEntitiesPending() {
        return _.sum(this.geAllSyncStatus().filter(s => s.entityName !== 'SyncTelemetry').map(s => s.queuedCount));
    }
}

export default EntitySyncStatusService;
