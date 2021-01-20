import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import AppHeader from "../common/AppHeader";
import React from "react";
import Reducers from "../../reducer";
import {CustomDashboardActionNames as Actions} from "../../action/customDashboard/CustomDashboardActions";
import {ScrollView, SafeAreaView, View, Text} from "react-native";
import _ from "lodash";
import CustomDashboardTab from "./CustomDashboardTab";
import CustomDashboardCard from "./CustomDashboardCard";
import TypedTransition from "../../framework/routing/TypedTransition";
import CHSNavigator from "../../utility/CHSNavigator";
import Colors from "../primitives/Colors";
import IndividualSearchResultPaginatedView from "../individual/IndividualSearchSeasultPaginatedView";
import CustomActivityIndicator from "../CustomActivityIndicator";
import GlobalStyles from "../primitives/GlobalStyles";

@Path('/customDashboardView')
class CustomDashboardView extends AbstractComponent {

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.customDashboard);
    }

    viewName() {
        return 'CustomDashboardView';
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, this.props);
        super.componentWillMount();
    }

    onDashboardNamePress(uuid) {
        this.dispatchAction(Actions.ON_DASHBOARD_CHANGE, {dashboardUUID: uuid})
    }

    renderDashboards() {
        return _.map(this.state.dashboards, dashboard =>
            <CustomDashboardTab
                dashboard={dashboard}
                activeDashboardUUID={this.state.activeDashboardUUID}
                onDashboardNamePress={this.onDashboardNamePress.bind(this)}/>
        );
    }

    renderCards() {
        return _.map(_.filter(this.state.reportCardMappings, ({dashboard}) => this.state.activeDashboardUUID === dashboard.uuid),
            rcm => <CustomDashboardCard key={rcm.uuid}
                                        reportCard={rcm.card}
                                        executeQueryActionName={Actions.EXECUTE_COUNT_QUERY}
                                        onCardPress={this.onCardPress.bind(this)}/>
        );
    }

    onCardPress(reportCardUUID) {
        this.dispatchAction(Actions.LOAD_INDICATOR, {loading: true});
        return setTimeout(() => this.dispatchAction(Actions.ON_CARD_PRESS, {
            reportCardUUID,
            cb: (individualSearchResults, count) => TypedTransition.from(this).with({
                indicatorActionName: Actions.LOAD_INDICATOR,
                headerTitle: 'subjectsList',
                searchResults: individualSearchResults,
                totalSearchResultsCount: count,
                onIndividualSelection: (source, individual) => CHSNavigator.navigateToProgramEnrolmentDashboardView(source, individual.uuid)
            }).to(IndividualSearchResultPaginatedView, true)
        }), 0);
    }

    renderZeroResultsMessageIfNeeded() {
        if (_.size(this.state.dashboards) === 0)
            return (
                <View>
                    <Text
                        style={GlobalStyles.emptyListPlaceholderText}>{this.I18n.t('dashboardsNotAvailable')}</Text>
                </View>
            );
        else
            return (<View/>);
    }

    render() {
        return (
            <CHSContainer style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader title={this.I18n.t('dashboards')}/>
                <SafeAreaView style={{height: 50}}>
                    <ScrollView horizontal style={{backgroundColor: Colors.cardBackgroundColor}}>
                        {this.renderDashboards()}
                        {this.renderZeroResultsMessageIfNeeded()}
                    </ScrollView>
                </SafeAreaView>
                <CHSContent>
                    <CustomActivityIndicator loading={this.state.loading}/>
                    <ScrollView>
                        {this.renderCards()}
                    </ScrollView>
                </CHSContent>
            </CHSContainer>
        );
    }
}


export default CustomDashboardView