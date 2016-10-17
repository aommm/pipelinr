
const NoValueError = require('../lib/error').NoValueError;
const RequiredError = require('../lib/error').RequiredError;

function required(x) {
    if (x instanceof NoValueError) {
        const e = new RequiredError();
        e.message = this._stacktrace.toString();
        throw e;
    }
    return x;
}
required.acceptsErrors = true;

module.exports = {
    required: required
};