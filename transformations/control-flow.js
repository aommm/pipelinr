
const NoValueError = require('../lib/error').NoValueError;
const RequiredError = require('../lib/error').RequiredError;
const {curry} = require('./utils');

function required(x) {
    if (x instanceof NoValueError) {
        const e = new RequiredError();
        e.message = this._stacktrace.toString();
        throw e;
    }
    return x;
}
required.acceptsErrors = true;

/**
 * Runs 'fn' on the 'n'th argument. Others are passed through as-is
 * @param {Number} n
 * @param {Function} fn
 * @param {*} x
 * @param {Number} i
 * @returns {*}
 */
function nth(n, fn, x, i) {
    if (i === n) {
        return fn.call(this, x, i);
    }
    return x;
}
nth = curry(nth);
nth.acceptsErrors = true;

/**
 * Runs 'fn' on all arguments except the 'n'th. The nth is passed through as-is
 * @param {Number} n
 * @param {Function} fn
 * @param {*} x
 * @param {Number} i
 * @returns {*}
 */
function exceptNth(n, fn, x, i) {
    if (i === n) {
        return x;
    }
    return fn.call(this, x, i);
}
exceptNth = curry(exceptNth);
exceptNth.acceptsErrors = true;


module.exports = {
    required: required,
    nth: nth,
    exceptNth: exceptNth
};