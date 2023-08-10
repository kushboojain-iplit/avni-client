import {ToastAndroid, Vibration, View, ScrollView, Button, NativeModules} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import AddressLevels from "../common/AddressLevels";
import {Actions} from "../../action/individual/PersonRegisterActions";
import _ from "lodash";
import AppHeader from "../common/AppHeader";
import Reducers from "../../reducer";
import WizardButtons from "../common/WizardButtons";
import {Individual, WorkItem, SingleCodedValue, SubjectType} from 'avni-models';
import General from "../../utility/General";
import PersonRegisterViewsMixin from "./PersonRegisterViewsMixin";
import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import Distances from "../primitives/Distances";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import RegistrationDateFormElement from "../form/formElement/RegistrationDateFormElement";
import IndividualNameFormElement from "../form/formElement/IndividualNameFormElement";
import DateOfBirthAndAgeFormElement from "../form/formElement/DateOfBirthAndAgeFormElement";
import GenderFormElement from "../form/formElement/GenderFormElement";
import GeolocationFormElement from "../form/formElement/GeolocationFormElement";
import SubjectRegisterView from "../subject/SubjectRegisterView";
import CHSNavigator from "../../utility/CHSNavigator";
import ValidationErrorMessage from "../form/ValidationErrorMessage";
import HouseholdState from "../../state/HouseholdState";
import {AvniAlert} from "../common/AvniAlert";
import {RejectionMessage} from "../approval/RejectionMessage";
import SingleSelectMediaFormElement from "../form/formElement/SingleSelectMediaFormElement";
import StaticFormElement from "../viewmodel/StaticFormElement";
import EntityService from "../../service/EntityService";
import AuthService from "../../service/AuthService";
import SettingsService from "../../service/SettingsService";
import {DeviceEventEmitter} from 'react-native';
import { AddressLevel, Gender, getUnderlyingRealmCollection } from "openchs-models";
import { getJSON } from "../../framework/http/requests";
const { Module } = NativeModules;

@Path('/personRegister')
class PersonRegisterView extends AbstractComponent {
    static propTypes = {
        params: PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.personRegister);
        this.formRow = {marginTop: Distances.ScaledVerticalSpacingBetweenFormElements};
        let currentWorkItem = this.props.params.workLists.getCurrentWorkItem();
        let subjectTypeName = currentWorkItem.parameters.subjectTypeName;
        const subjectType = context.getService(EntityService).findByKey('name', subjectTypeName, SubjectType.schema.name);
        this.state = {displayed:true, isAllowedProfilePicture: subjectType.allowProfilePicture};
        this.scrollRef = React.createRef();
    }

    viewName() {
        return 'PersonRegisterView';
    }

    getTitleForGroupSubject(){
        const currentWorkItem = this.props.params.workLists.getCurrentWorkItem();
        if (_.includes([WorkItem.type.HOUSEHOLD, WorkItem.type.ADD_MEMBER], currentWorkItem.type)) {
            const {headOfHousehold} = currentWorkItem.parameters;
            return headOfHousehold ? 'headOfHouseholdReg' : 'memberReg';
        }
    }

    get registrationType() {
        const workListName = _.get(this, 'props.params.workLists.currentWorkList.name');
        const regName = workListName === 'Enrolment' ? _.get(_.find(this.props.params.workLists.currentWorkList.workItems, wl => wl.type === 'PROGRAM_ENROLMENT'), "parameters.programName") : workListName;
        return this.getTitleForGroupSubject() || regName + ' ' || 'REG_DISPLAY-Individual';
    }

    dispatchOnLoad(params, patientInfo) {
        this.dispatchAction(Actions.ON_LOAD,
            {
                individualUUID: params.individualUUID,
                groupSubjectUUID: params.groupSubjectUUID,
                workLists: params.workLists,
                isDraftEntity: params.isDraftEntity,
                pageNumber: params.pageNumber,
                taskUuid: params.taskUuid,
                abhaResponse: patientInfo
            });
    }

    UNSAFE_componentWillMount() {
        const params = this.props.params;
        let patientInfo;
        this.dispatchOnLoad(params, null)

        DeviceEventEmitter.addListener('abha_response', (Event) => {
            if (Event && Event.patientInfo) {
                try {
                    patientInfo = JSON.parse(Event.patientInfo);
                    if (patientInfo) {
                        this.dispatchOnLoad(params, patientInfo);
                        this.updateMandatoryFormFields(patientInfo);
                    }
                }
                catch (error) {
                    console.error('Error parsing event data:', error);
                }
            }
        });
        super.UNSAFE_componentWillMount();
    }

    updateMandatoryFormFields(patientInfo) {
        this.dispatchAction(Actions.REGISTRATION_ENTER_DOB, { value: new Date(patientInfo.dateOfBirth) });
        this.dispatchAction(Actions.REGISTRATION_ENTER_FIRST_NAME, { value: patientInfo.firstName });
        this.dispatchAction(Actions.REGISTRATION_ENTER_LAST_NAME, { value: patientInfo.lastName });

        const genders = this.getService(EntityService).getAll(Gender.schema.name);
        const genderList = getUnderlyingRealmCollection(genders);
        const patientGender = genderList.find(item => item.name === patientInfo.gender);
        patientGender && this.dispatchAction(Actions.REGISTRATION_ENTER_GENDER, { value: { uuid: patientGender.uuid, name: patientGender.name } });


        const addressLevels = this.getService(EntityService).getAll(AddressLevel.schema.name);
        const addressLevelsList = getUnderlyingRealmCollection(addressLevels);
        const addressLevel = addressLevelsList.find(item => item.name === (patientInfo.villageTownCity).toUpperCase());
        addressLevel && this.dispatchAction(Actions.REGISTRATION_ENTER_ADDRESS_LEVEL, { value: addressLevel });
    }

    shouldComponentUpdate(nextProps, nextState) {
        return nextState.wizard.isNonFormPage();
    }

    displayMessage(message) {
        if (message && this.state.displayed){
            ToastAndroid.show(message, ToastAndroid.SHORT);
            this.setState({displayed:false})
        }
    }

    static canLoad(args, parent) {
        return SubjectRegisterView.canLoad(args, parent);
    }

    onAppHeaderBack(saveDraftOn) {
        const onYesPress = () => CHSNavigator.navigateToFirstPage(this, [PersonRegisterView]);
        saveDraftOn ? onYesPress() : AvniAlert(this.I18n.t('backPressTitle'), this.I18n.t('backPressMessage'), onYesPress, this.I18n);
    }

    async getABHANumbers() {
        const serverUrl = this.getService(SettingsService).getSettings().serverURL;
        const patientSubjects = await getJSON(`${serverUrl}/api/subjects?lastModifiedDateTime=2023-02-26T01:30:00.000Z&subjectType=Patient`);
        return patientSubjects.content.filter(obj => obj.observations["ABHA Number"] != null).map(obj => obj.observations["ABHA Number"]);
    }

    invokeModule = async () => {
        const authService = this.context.getService(AuthService);
        const settings = this.context.getService(SettingsService);
        const authToken = await authService.getAuthProviderService().getAuthToken()
        const abhaNumbers = await this.getABHANumbers();
        Module.invoke(authToken, abhaNumbers, settings.getHipBaseURL());
    }

    isButtonDisabled = () => {
        const { individual } = this.state;
        if (individual?.that?.observations) {
            const result = individual.that.observations.find(
                obj => obj.concept?.name === "ABHA Number" && obj.valueJSON?.value
            );
            return !!result;
        }
        return false;
    };

    render() {
        General.logDebug(this.viewName(), `render`);
        const profilePicFormElement = new StaticFormElement("profilePicture", false, 'Profile-Pics', []);
        const editing = !_.isNil(this.props.params.individualUUID);
        const title = `${this.I18n.t(this.registrationType)} ${this.I18n.t('registration')}`;
        {this.displayMessage(this.props.params.message)}
        return (
            <CHSContainer>
                <CHSContent>
                    <AppHeader title={title}
                               func={() => this.onAppHeaderBack(this.state.saveDrafts)} displayHomePressWarning={!this.state.saveDrafts}/>
                    <RejectionMessage I18n={this.I18n} entityApprovalStatus={this.state.individual.latestEntityApprovalStatus}/>
                    <ScrollView keyboardShouldPersistTaps="handled"
                        ref={this.scrollRef} style={{
                        marginTop: Distances.ScaledVerticalSpacingDisplaySections,
                        flexDirection: 'column',
                        paddingHorizontal: Distances.ScaledContentDistanceFromEdge
                    }}>
                     <Button title="Register with ABHA >>" onPress={this.invokeModule} style={{marginBottom: 50}} disabled={this.isButtonDisabled()}/>
                        <GeolocationFormElement
                            actionName={Actions.REGISTRATION_SET_LOCATION}
                            errorActionName={Actions.SET_LOCATION_ERROR}
                            location={this.state.individual.registrationLocation}
                            editing={editing}
                            validationResult={AbstractDataEntryState.getValidationError(this.state, Individual.validationKeys.REGISTRATION_LOCATION)}/>
                        <RegistrationDateFormElement date={this.state.individual.registrationDate}
                                                     validationResult={AbstractDataEntryState.getValidationError(this.state, Individual.validationKeys.REGISTRATION_DATE)}
                        />
                        <IndividualNameFormElement state={this.state}/>
                        <SingleSelectMediaFormElement
                            element={{...profilePicFormElement}}
                            value={new SingleCodedValue(this.state.individual.profilePicture)}
                            isShown={this.state.isAllowedProfilePicture}
                            actionName={Actions.REGISTRATION_SET_PROFILE_PICTURE}/>
                        <DateOfBirthAndAgeFormElement state={this.state}/>
                        <ValidationErrorMessage validationResult={AbstractDataEntryState.getValidationError(this.state, HouseholdState.validationKeys.RELATIVE_AGE)}/>
                        <GenderFormElement state={this.state}/>
                        <ValidationErrorMessage validationResult={AbstractDataEntryState.getValidationError(this.state, HouseholdState.validationKeys.RELATIVE_GENDER)}/>
                        <AddressLevels
                            selectedLowestLevel={this.state.individual.lowestAddressLevel}
                            multiSelect={false}
                            validationError={AbstractDataEntryState.getValidationError(this.state, Individual.validationKeys.LOWEST_ADDRESS_LEVEL)}
                            mandatory={true}
                            onLowestLevel={(lowestSelectedAddresses) =>
                                this.dispatchAction(Actions.REGISTRATION_ENTER_ADDRESS_LEVEL, {value: _.head(lowestSelectedAddresses)})}
                            minLevelTypeUUIDs={this.state.minLevelTypeUUIDs}
                        />
                        <WizardButtons
                            next={{func: () => PersonRegisterViewsMixin.next(this), label: this.I18n.t('next')}}/>
                    </ScrollView>

                </CHSContent>
            </CHSContainer>
        );
    }
}

export default PersonRegisterView;
