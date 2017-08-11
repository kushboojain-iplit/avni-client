import General from "../../utility/General";
import _ from 'lodash';

const fetchFactory = (endpoint, method = "GET", params) => fetch(endpoint, {"method": method, ...params});

const makeHeader = (type) => new Map([['json', {
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
}], ['text', {headers: {'Accept': 'text/plain', 'Content-Type': 'text/plain'}}]]).get(type);

const makeRequest = (type, opts = {}) => Object.assign({...makeHeader(type), ...opts});

let _get = (endpoint, cb, errorHandler) => {
    General.logDebug('Requests', `Calling: ${endpoint}`);
    return fetchFactory(endpoint, "GET", makeHeader("json"))
        .then((response) => response.json())
        .then(cb)
        .catch(errorHandler);
};

let _getText = (endpoint, cb, errorHandler) => {
    General.logDebug('Requests', `Calling getText: ${endpoint}`);
    return fetchFactory(endpoint, "GET", makeHeader("text"))
        .then((response) => {
            if (!response.ok) {
                General.logError('Requests', `Error for ${endpoint}: ${JSON.stringify(response)}`);
                throw new Error(`HTTP Status: ${response.status}`);
            }
            return response.text();
        })
        .then(cb)
        .catch(errorHandler);
};

let _post = (endpoint, file, cb, errorHandler = _.noop) => {
    const params = makeRequest("json", {body: JSON.stringify(file)});
    return fetchFactory(endpoint, "POST", params)
        .then(cb)
        .catch(errorHandler);
};

export let post = _post;

export let get = (endpoint, cb, errorHandler) => {
    return _getText(endpoint, cb, errorHandler);
};

export let getJSON = (endpoint, cb, errorHandler = _.noop) => {
    return _get(endpoint, cb, errorHandler);
};