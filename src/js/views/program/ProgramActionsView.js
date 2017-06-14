import TypedTransition from "../../framework/routing/TypedTransition";
import {View, TouchableNativeFeedback, Text} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import Colors from "../primitives/Colors";
import CHSNavigator from "../../utility/CHSNavigator";
import {
    ProgramEncounterTypeChoiceActionNames,
    EncounterTypeChoiceActionNames
} from "../../action/program/ProgramEnrolmentDashboardActions";
import GrowthChartView from "./GrowthChartView";
import * as _ from "lodash";
import Fonts from "../primitives/Fonts";

@Path('/ProgramActionsView')
class ProgramActionsView extends AbstractComponent {
    constructor(props, context){
        super(props, context, "something");
        this.goToView = this.goToView.bind(this);
    }
    static propTypes = {
        programDashboardButtons: React.PropTypes.array.isRequired,
        enrolment: React.PropTypes.object.isRequired,
    };

    startEncounter() {
        this.dispatchAction(Reducers.STATE_CHANGE_POSSIBLE_EXTERNALLY);
        this.dispatchAction(EncounterTypeChoiceActionNames.LAUNCH_CHOOSE_ENTITY_TYPE);
    }

    startProgramEncounter() {
        this.dispatchAction(ProgramEncounterTypeChoiceActionNames.LAUNCH_CHOOSE_ENTITY_TYPE);
    }

    openChecklist() {
        CHSNavigator.navigateToChecklistView(this, this.props.enrolment.uuid);
    }

    goToView(button) {
        TypedTransition.from(this).bookmark().with({data: _.get(button, ['openOnClick', 'data']), enrolment: this.props.enrolment}).to(GrowthChartView);
    }

    renderButton(onPress, buttonColor, text, textColor) {
        return (
            <TouchableNativeFeedback onPress={onPress}>
                <View  style={{ height: 36, marginBottom: 8, elevation: 2, borderRadius: 4, width: 288,
                    elevation: 3, backgroundColor: buttonColor,
                    alignItems: 'center', justifyContent: 'center'}}>
                    <Text style={{
                        fontSize: Fonts.Medium,
                        color: textColor
                    }}>{text.toUpperCase()}</Text>
                </View>
            </TouchableNativeFeedback>
        );
    }

    render() {
        return (
            <View
                style={{flexDirection: 'column', marginTop: 8}}>
                {this.props.enrolment.isActive ?
                    this.renderButton(() => this.startProgramEncounter(), Colors.DefaultPrimaryColor,
                        this.I18n.t('startProgramVisit'), Colors.TextOnPrimaryColor)
                    :
                    <View/>}
                {this.props.enrolment.hasChecklist ?
                    this.renderButton(() => this.openChecklist(), Colors.DefaultPrimaryColor,
                        this.I18n.t('openChecklist'), Colors.TextOnPrimaryColor)
                    :
                    <View/>}
                {this.renderButton(() => this.startEncounter(), Colors.SecondaryActionButtonColor,
                    this.I18n.t('startGeneralVisit'), Colors.PrimaryTextColor)}
                {_.map(this.props.programDashboardButtons, (button) => this.renderButton(() => this.goToView(button),
                    Colors.SecondaryActionButtonColor, button.label, Colors.PrimaryTextColor))}
            </View>
        );
    }
}

export default ProgramActionsView;