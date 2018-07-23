import {expect, assert} from "chai";
import EntityFactory from "../../../openchs-models/test/EntityFactory";
import {gestationalAgeCategoryAsOn, eddBasedOnGestationalAge, gestationalAgeAsOfToday} from "../../health_modules/mother/calculations";
import motherConcepts from "../../health_modules/mother/metadata/motherConcepts.json";
import commonConcepts from "../../health_modules/commonConcepts.json";
import ProgramFactory from "../ref/ProgramFactory";
import EnrolmentFiller from "../ref/EnrolmentFiller";
import program from "../../health_modules/mother/metadata/motherProgram";
import moment from "moment";


describe("Calculations Test", () => {
    let programData;

    beforeEach(() => {
        programData = new ProgramFactory(program)
            .withConcepts(commonConcepts)
            .withConcepts(motherConcepts)
            .build();
    });

    it("should gestational age based on LMP", () => {
        let mother = EntityFactory.createIndividual("Test mother");

        let enrolment = new EnrolmentFiller(programData, mother, new Date())
            .forConcept("Last menstrual period", moment().subtract(35, 'weeks').toDate())
            .build();
        expect(gestationalAgeCategoryAsOn(new Date(), enrolment)).to.equal('Very preterm');

        enrolment = new EnrolmentFiller(programData, mother, new Date())
            .forConcept("Last menstrual period", moment().subtract(36, 'weeks').toDate())
            .build();
        expect(gestationalAgeCategoryAsOn(new Date(), enrolment)).to.equal('Preterm');

        enrolment = new EnrolmentFiller(programData, mother, new Date())
            .forConcept("Last menstrual period", moment().subtract(37, 'weeks').toDate())
            .build();
        expect(gestationalAgeCategoryAsOn(new Date(), enrolment)).to.equal('Preterm');

        enrolment = new EnrolmentFiller(programData, mother, new Date())
            .forConcept("Last menstrual period", moment().subtract(38, 'weeks').toDate())
            .build();
        expect(gestationalAgeCategoryAsOn(new Date(), enrolment)).to.equal('Term');
    });

    it('Should get edd based on gestational age', function () {
        let estimatedGestationalAgeInWeeks = 12;
        let estimateDate = new Date(2018, 6, 22);
        let edd = eddBasedOnGestationalAge(estimatedGestationalAgeInWeeks, estimateDate);
        expect(edd.getTime()).is.equal(new Date(2019, 1, 3).getTime());
    });

    it('Should get gestational age as of today', function () {
        let estimatedGestationalAgeInWeeks = 16;
        let estimatedOnDate = new Date(2018, 5, 22);
        let today = new Date(2018, 6, 22);
        expect(gestationalAgeAsOfToday(16, estimatedOnDate, today)).is.equal(20);
    });
});
