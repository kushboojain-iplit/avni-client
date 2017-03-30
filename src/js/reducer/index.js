import IndividualSearchActions from "../action/individual/IndividualSearchActions";
import IndividualRegisterActionMap, {IndividualRegisterActions} from "../action/individual/IndividualRegisterActions";
import Reducer from "./Reducer";
import IndividualSearchCriteria from "../service/query/IndividualSearchCriteria";
import EntityService from "../service/EntityService";
import AddressLevel from "../models/AddressLevel";
import IndividualProfileActionMap, {IndividualProfileActions} from "../action/individual/IndividualProfileActions";
import ProgramEnrolmentActionMap, {ProgramEnrolmentActions} from '../action/prorgam/ProgramEnrolmentActions';
import IndividualGeneralHistoryActionsMap, {IndividualGeneralHistoryActions} from '../action/individual/IndividualGeneralHistoryActions';
import {
    EncounterActions,
    IndividualEncounterViewActionsMap
} from "../action/individual/EncounterActions";
import SystemRecommendationActionMap, {SystemRecommendationActions} from '../action/individual/SystemRecommendationActions';
import {
    DashboardActions,
    DashboardActionsMap
} from "../action/prorgam/DashboardActions";
import {
    ProgramEnrolmentsActions,
    ProgramEnrolmentsActionsMap
} from "../action/prorgam/ProgramEnrolmentsActions";
import {ProgramEnrolmentDashboardActions, ProgramEnrolmentDashboardActionsMap} from '../action/prorgam/ProgramEnrolmentDashboardActions';
import {ProgramEncounterActions, ProgramEncounterActionsMap} from '../action/prorgam/ProgramEncounterActions';
import {IndividualRegistrationDetailsActions, IndividualRegistrationDetailsActionsMap} from '../action/individual/IndividualRegistrationDetailsActions';

const reducerMapFn = function (beanStore) {
    let reducerMap = {};

    let add = function (actions, initState) {
        return Reducer.factory(actions, initState, beanStore);
    };

    reducerMap[reducerKeys.individualSearch] = add(IndividualSearchActions, {searchCriteria: IndividualSearchCriteria.empty(), individualSearchResults: []});
    reducerMap[reducerKeys.addressLevels] = add(new Map([]), beanStore.get(EntityService).getAll(AddressLevel.schema.name));
    reducerMap[reducerKeys.individualRegister] = add(IndividualRegisterActionMap, IndividualRegisterActions.getInitialState(beanStore));
    reducerMap[reducerKeys.individualProfile] = add(IndividualProfileActionMap, IndividualProfileActions.getInitialState(beanStore));
    reducerMap[reducerKeys.programEnrolment] = add(ProgramEnrolmentActionMap, ProgramEnrolmentActions.getInitialState(beanStore));
    reducerMap[reducerKeys.individualGeneralHistory] = add(IndividualGeneralHistoryActionsMap, IndividualGeneralHistoryActions.getInitialState(beanStore));
    reducerMap[reducerKeys.encounter] = add(IndividualEncounterViewActionsMap, EncounterActions.getInitialState(beanStore));
    reducerMap[reducerKeys.systemRecommendation] = add(SystemRecommendationActionMap, SystemRecommendationActions.getInitialState(beanStore));
    reducerMap[reducerKeys.dashboard] = add(DashboardActionsMap, DashboardActions.getInitialState(beanStore));
    reducerMap[reducerKeys.programEnrolments] = add(ProgramEnrolmentsActionsMap, ProgramEnrolmentsActions.getInitialState(beanStore));
    reducerMap[reducerKeys.programEnrolmentDashboard] = add(ProgramEnrolmentDashboardActionsMap, ProgramEnrolmentDashboardActions.getInitialState(beanStore));
    reducerMap[reducerKeys.programEncounter] = add(ProgramEncounterActionsMap, ProgramEncounterActions.getInitialState(beanStore));
    reducerMap[reducerKeys.individualRegistrationDetails] = add(IndividualRegistrationDetailsActionsMap, IndividualRegistrationDetailsActions.getInitialState(beanStore));

    return reducerMap;
};

const reducerKeys = {
    programEnrolment: "programEnrolment",
    individualGeneralHistory: "individualGeneralHistory",
    encounter: "encounter",
    systemRecommendation: "systemRecommendation",
    individualRegister: "individualRegister",
    individualProfile: 'individualProfile',
    dashboard: 'dashboard',
    programEnrolments: 'programEnrolments',
    programEnrolmentDashboard: 'programEnrolmentDashboard',
    programEncounter: 'programEncounter',
    individualRegistrationDetails: 'individualRegistrationDetails',
    individualSearch: 'individualSearch',
    addressLevels: 'addressLevels'
};

export {reducerMapFn as initReducers};

export default reducerKeys;