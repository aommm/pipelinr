'use strict';

const _ = require('lodash');

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

function defaultValue (def, x) {
    return x instanceof NoValueError ? def : x;
}
defaultValue.acceptsErrors = true;
defaultValue = curry(defaultValue);

/**
 * Applies a many-to-x transformation several times
 * (useful when you want to transform nested arrays)
 * @param fn - many-to-many or many-to-one transformation
 * @param xs
 * @param i
 */
function forAll(fn, xs, i) {
    if (_.isArray(xs)) {
        return xs.map((x, i) => this.tryOrUndefined.call(this, fn, x, i));
    } else {
        return new NoValueError();
    }

}
forAll.acceptsErrors = true;
forAll = curry(forAll);

/**
 * Runs 'fn' on the 'n'th argument. Others are passed through as-is
 * @param {Number} n
 * @param {Function} fn
 * @param {*} xs
 * @param {Number} i
 * @returns {*}
 */
function forNth(n, fn, xs, i) {
    return xs.map(function (x, i) {
        if (i === n) {
            return this.tryOrUndefined.call(this, fn, x, i);
        }
        return x;
    }, this);
}
forNth = curry(forNth);
forNth.acceptsErrors = true;

function log(xs) {
    console.log('logging:', xs);
    return xs;
}
log.acceptsErrors = true;

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
    return this.tryOrUndefined.call(this, fn, x, i);
}
exceptNth = curry(exceptNth);
exceptNth.acceptsErrors = true;

/**
 * Calls the given functions one after another, passing the return value from one to the next
 * Functions are always invoked with the previous functions return value and the original i value
 * @param [Function[]] fns
 * @param x - the first value
 * @param i
 * @returns {*}
 */
function flow(fns, x, i) {
    for (const fn of fns) {
        x = this.tryOrUndefined.call(this, fn, x, i);
    }
    return x;
}
flow = curry(flow);

/**
 * Checks f(x), resulting in NoValueError if it is false.
 * @param {Function} f
 * @param {*} x
 * @returns {*|NoValueError}
 */
function guard(f, x) {
    if (f(x)) {
        return x;
    }
    return new NoValueError();
}
guard = curry(guard);

module.exports = {
    required: required,
    defaultValue: defaultValue,
    log: log,
    forAll: forAll,
    forNth: forNth,
    exceptNth: exceptNth,
    flow: flow,
    guard: guard
};
