'use strict';
const _ = require('lodash');

class NoValueError extends Error {
    constructor(msg) {
        super(msg);
        this.customToString = true;
    }
    toString() {
        return "NoValueError";
    }
}

class RequiredError extends Error {
    constructor(msg) {
        super(msg);
        this.customToString = true;
    }
    toString() {
        return "RequiredError";
    }
}

class Stacktrace extends Array {
    toString() {
        const x = _.map(this, function (val) {
            return val.toString();
        });
        return '\n' + x.join('\n') + '\n';
    }
}

class StacktraceStep {
    constructor(step, prevValues, values, transformation) {
        this.step = step;
        this.prevValues = prevValues;
        this.values = values;
        this.transformation = transformation;
    }

    toString() {
        const _this = this;
        const ss = [];
        ss.push("-------------------");
        ss.push(`-- Evaluation step: ${this.step}`);
        if (this.transformation.manyToOne) {
            const name = this.transformation.name || 'anonymous';
            ss.push(`-- ${name}`);
            _.forEach(this.prevValues, function (prevValue, i) {
                ss.push(`Input #${i}: ${prevValue}`);
            });
            ss.push(`Output: ${this.values[0]}`);
        }
        else if (_.isArray(this.transformation)) {
            _.forEach(this.transformation, function (transformation, i) {
                const name = transformation.name || 'anonymous';
                let prevValue = (_this.prevValues && _this.prevValues[i]);
                prevValue = _this.stringifyValue(prevValue);
                let value = (_this.values && _this.values[i]);
                value = _this.stringifyValue(value);
                ss.push(`-- ${name}`);
                ss.push(`Input: ${prevValue}`);
                ss.push(`Output: ${value}\n`);
            });
        } else {
            const name = this.transformation.name || 'anonymous';
            _.forEach(this.prevValues, function (prevValue, i) {
                prevValue = _this.stringifyValue(prevValue);
                let value = (_this.values && _this.values[i]);
                value = _this.stringifyValue(value);
                ss.push(`-- ${name}`);
                ss.push(`Input: ${prevValue}`);
                ss.push(`Output: ${value}\n`);
            });
        }
        return ss.join('\n');
    }

    stringifyValue(v) {
        if (v && v.customToString) {
            return v.toString();
        } else {
            return JSON.stringify(v, null, 2);
        }
    }
}

module.exports = {
    Stacktrace: Stacktrace,
    StacktraceStep: StacktraceStep,
    RequiredError: RequiredError,
    NoValueError: NoValueError
};
