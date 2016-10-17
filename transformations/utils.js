'use strict';
/**
 * Utilities for writing transforms
 */

const _ = require('lodash');

/**
 * Creates a curried version of fx, like _.curry
 * Two important features, for function serialisation:
 * - Preserves the 'toString' method
 * - Keeps partially applied arguments in 'appliedArgs' array
 * @param {Function} fx - function to curry
 * @returns {Function} - curried function. Has 'appliedArgs' property
 */
function curry(fx) {
    var arity = fx.length;
    function f1() {
        var args = Array.prototype.slice.call(arguments, 0);
        if (args.length >= arity) {
            return fx.apply(null, args);
        }
        else {
            function f2() {
                var args2 = Array.prototype.slice.call(arguments, 0);
                return f1.apply(null, args.concat(args2));
            }
            f2.appliedArgs = args; // save arguments
            copyProps(f1, f2); // if properties are set AFTER curry() call
            copyProps(fx, f2); // if properties are set BEFORE curry() call
            setToString(f2, fx + ''); // save original function string
            Object.defineProperty(f2, 'name', {value: fx.name});
            return f2;
        }
    }
    f1.appliedArgs = [];
    copyProps(fx, f1); // copy e.g. 'manyToOne'
    setToString(f1, fx + ''); // save original function string
    Object.defineProperty(f1, 'name', {value: fx.name});
    return f1;
}

/**
 * Sets the toString property of the given function
 * @param func
 * @param string
 */
function setToString(func, string) {
    Object.defineProperty(func, 'toString', {
        'configurable': true,
        'enumerable': false,
        'value': _.constant(string),
        'writable': true
    });
}

// Copy properties from one object to another
function copyProps(from, to) {
    for (var x in from) {
        if (from.hasOwnProperty(x)) {
            to[x] = from[x];
        }
    }
}

module.exports = {
    curry: curry
};
