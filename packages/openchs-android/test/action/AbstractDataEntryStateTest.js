import {expect} from "chai";
import {ValidationResult, Observation, PrimitiveValue, Concept} from 'openchs-models';
import Wizard from "../../src/state/Wizard";
import WizardNextActionStub from "./WizardNextActionStub";
import StubbedDataEntryState from "./StubbedDataEntryState";
import ObservationsHolderActions from '../../src/action/common/ObservationsHolderActions';
import TestContext from "./views/testframework/TestContext";
import EntityFactory from "openchs-models/test/EntityFactory";
import WorkItem from "openchs-models/src/application/WorkItem";
import WorkLists from "openchs-models/src/application/WorkLists";
import WorkList from "openchs-models/src/application/WorkList";

describe('AbstractDataEntryStateTest', () => {
    var formElementGroup;
    var testContext;

    beforeEach(function () {
        formElementGroup = EntityFactory.createSafeFormElementGroup(EntityFactory.createForm('foo'));
        testContext = new TestContext();
    });

    it('next when there are validation errors', () => {
        const concept = EntityFactory.createConcept('c1', Concept.dataType.Boolean);
        const formElement = EntityFactory.createFormElement('bar', true, concept);
        formElementGroup.addFormElement(formElement);

        const workLists = new WorkLists(new WorkList('Test', [new WorkItem('100', WorkItem.type.ENCOUNTER, {
            subjectUUID:'100100100',
            encounter:{},
        })]));

        var dataEntryState = new StubbedDataEntryState([ValidationResult.failureForEmpty('h')], formElementGroup, new Wizard(1, 1), [], workLists);
        var action = WizardNextActionStub.forValidationFailed();
        dataEntryState.handleNext(action, testContext);
        action.assert();

        dataEntryState = new StubbedDataEntryState([ValidationResult.successful('h')], formElementGroup, new Wizard(1, 1), [], workLists);
        action = WizardNextActionStub.forValidationFailed();
        dataEntryState.handleNext(action, testContext);
        action.assert();

        const obs = [Observation.create(concept, new PrimitiveValue(true))];
        dataEntryState = new StubbedDataEntryState([ValidationResult.successful('h')], formElementGroup, new Wizard(1, 1), obs, workLists);
        action = WizardNextActionStub.forCompleted();
        dataEntryState.handleNext(action, testContext);
        action.assert();
    });

    it('single select form element data entry', () => {
        const concept = EntityFactory.createConcept('c1', Concept.dataType.Coded);
        EntityFactory.addCodedAnswers(concept, ['a1', 'a2', 'a3']);
        const formElement = EntityFactory.createFormElement('bar', true, concept);
        formElementGroup.addFormElement(formElement);

        const workLists = new WorkLists(new WorkList('Test', [new WorkItem('100', WorkItem.type.ENCOUNTER, {
            subjectUUID:'100100100',
            encounter:{},
        })]));

        var dataEntryState = new StubbedDataEntryState([], formElementGroup, new Wizard(1, 1), [], workLists);
        dataEntryState = ObservationsHolderActions.toggleSingleSelectAnswer(dataEntryState, {formElement: formElement, answerUUID: concept.getPossibleAnswerConcept('a1').uuid}, testContext)
        const observation = dataEntryState.observationsHolder.findObservation(concept);
        expect(observation.getValueWrapper().getConceptUUID()).is.equal(concept.getPossibleAnswerConcept('a1').uuid);
    });
});