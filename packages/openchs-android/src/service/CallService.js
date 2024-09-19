import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import SettingsService from "./SettingsService";
import UserInfoService from "./UserInfoService";
import _ from "lodash";
import {post} from "../framework/http/requests";


@Service("CallService")
class CallService extends BaseService {

    constructor(db, context) {
        super(db, context);
    }

    callBeneficiary(context, number, immediateCallCb, maskedCallResponseCb) {
        const userSettings = this.getService(UserInfoService).getUserSettings();
        const isCallMaskNeeded = _.get(userSettings, "enableCallMasking", false);

        if (isCallMaskNeeded) {
            this.connectCall(number, maskedCallResponseCb);
        } else {
            immediateCallCb();
        }
    }

    connectCall(number, maskedCallResponseCb) {
        const serverURL = this.getService(SettingsService).getSettings().serverURL;

        post(`${serverURL}/maskedCall?to=${number}`, null, true)
            .then(res => res.json())
            .then(({success, message}) => {
                if (success) {
                    maskedCallResponseCb("Requested for masked call. Expect a call on your number.");
                } else {
                    maskedCallResponseCb(`Cannot perform masked call at this time. ${message}`);
                }
            })
            .catch(error => {
                    maskedCallResponseCb("Cannot perform masked call at this time. (Internet connection unavailable/System error)")
                }
            );
    }
}

export default CallService;
