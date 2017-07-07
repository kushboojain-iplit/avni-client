import _ from "lodash";

class CodedAnswers {
    constructor(answer) {
        this.answer = _.isNil(answer) ? [] : _.flatten([answer]);
    }

    push(answerUUID) {
        this.answer.push(answerUUID);
        return this;
    }

    removeAnswer(conceptUUID) {
        _.remove(this.answer, (item) => item === conceptUUID);
    }

    hasAnswer(answerUUID) {
        return this.answer.includes(answerUUID);
    }

    toggleAnswer(answerUUID) {
        if (this.hasAnswer(answerUUID)) {
            this.removeAnswer(answerUUID);
        } else {
            this.push(answerUUID);
        }
    }

    getValue() {
        return this.answer;
    }

    get toResource() {
        return this.getValue();
    }

    cloneForEdit() {
        return new CodedAnswers(this.answer);
    }

    valueAsString(conceptService, I18n) {
        return _.join(this.getValue().map((value) => {
            return I18n.t(conceptService.getConceptByUUID(value).name);
        }), ', ');
    }
}

export default CodedAnswers;