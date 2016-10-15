'use strict';

const _ = require('lodash');
const cheerio = require('cheerio');
const co = require('co');
const bb = require('bluebird');
let request = require('request');
request = bb.promisify(request, {multiArgs: true});


class Evaluator {
    constructor(data) {
        this.data = data;
    }

    /**
     * Translates transformations from shorthand to proper syntax
     * (E.g. 'selector' -> [['selector']])
     * @param {Array} transformations
     * @returns {Array} transformations
     * @private
     */
    _translate(transformations) {
        transformations = _.cloneDeep(transformations);
        // 'a' -> ['a']
        if (_.isString(transformations)) {
            transformations = [transformations];
        }
        if (!_.isArray(transformations)) {
            throw new Error("instructions has to be string or array");
        }
        // ['a', 'b', fn] -> [['a', 'b'], fn]
        const selectors = _.takeWhile(transformations, _.isString);
        if (selectors.length>0) {
            transformations = transformations.slice(selectors.length);
            transformations.unshift(selectors);
        }
        return transformations;
    }

    /**
     * Runs the given transformations using this evaluator
     * @param {Array} transformations
     * @returns {*} one value
     * @throws
     */
    eval(transformations) {
        transformations = this._translate(transformations);
        // evaluate selectors
        const selectors = transformations.shift();
        let vals = _.map(selectors, this.get.bind(this));
        // run instructions
        vals = _.reduce(transformations, function(vals, transformation) {
            console.log("vals:", vals);
            // transformation wants array
            if (transformation.manyToOne) {
                const nextVal = tryOrUndefined(() => transformation(vals));
                return [nextVal];
            }
            // 'transformation' is actually many transformations: one per value
            if (_.isArray(transformation)) {
                if (vals.length !== transformation.length) {
                    throw new Error(`Mismatching number of arguments (${vals.length}) and transformations (${transformation.length})`);
                }
                return _.zipWith(transformation, vals, function(transformation, val) {
                    const nextVal = tryOrUndefined(() => transformation(val));
                    return nextVal;
                });
            }
            // transformation wants individual values
            return _.map(vals, (val) => tryOrUndefined(transformation.bind(null, val)));
        }, vals);

        if (vals.length !== 1) {
            throw new Error(`Transformation must always result in 1 value (got ${vals.length})`)
        }
        return vals[0];
    }
}

class HtmlEvaluator extends Evaluator {
    constructor(data) {
        super(data);
        this.$ = cheerio.load(data);
    }
    get(selector) {
        const el = this.$(selector);
        if (el && el.length) {
            return el.text();
        }
    }
}

function tryOrUndefined(fn) {
    try {
        return fn();
    } catch (e) {
        return undefined;
    }
}

/**
 * Sets the toString method of the given function
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
};

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
            return f2;
        }
    }
    f1.appliedArgs = [];
    copyProps(fx, f1); // copy e.g. 'manyToOne'
    setToString(f1, fx + ''); // save original function string
    return f1;
}

// Copy properties from one object to another
function copyProps(from, to) {
    for (var x in from) {
        if (from.hasOwnProperty(x)) {
            to[x] = from[x];
        }
    }
}

return co(function*() {
    const trim = (x) => x.trim();
    const toLowerCase = (x) => x.toLowerCase();
    const toUpperCase = (x) => x.toUpperCase();
    const concat = (xs) => xs.join('');
    concat.manyToOne = true;
    let join = (sep, xs) => xs.join(sep);
    join.manyToOne = true;
    join = curry(join);
    const head = (xs) => xs[0];
    head.manyToOne = true;
    let defaultValue = (def, x) => _.isUndefined(x) ? def : x;
    defaultValue = curry(defaultValue);

    const transformations = [
        '.itemlist .athing:nth-child(1)',
        '.itemlist > tr:nth-child(2) > td:nth-child(2)',
        'brokenSelector',
        [toLowerCase, toUpperCase, toUpperCase],
        trim,
        defaultValue("I am a default value"),
        join('\n')
    ];

    const [response, body] = yield request('https://news.ycombinator.com/');
    const htmlEvaluator = new HtmlEvaluator(body);
    const res = htmlEvaluator.eval(transformations);
    console.log("res:", res);
}).catch(function(x) {
    console.error('err', x);
});

