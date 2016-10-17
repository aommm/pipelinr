'use strict';
/**
 * The Pipelinr library
 * Exports 'Evaluator' and 'HtmlEvaluator' for evaluating pipelines
 */

const _ = require('lodash');

const NoValueError = require('./error').NoValueError;
const RequiredError = require('./error').RequiredError;
const Stacktrace = require('./error').Stacktrace;
const StacktraceStep = require('./error').StacktraceStep;

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
        const _this = this;
        _this._stacktrace = new Stacktrace();

        transformations = _this._translate(transformations);
        // evaluate selectors
        const selectors = transformations.shift();
        let vals = _.map(selectors, this.get.bind(this));
        const fakeTransformations = _.map(selectors, _.constant({name: 'get'}));
        _this._stacktrace.push(new StacktraceStep('(selectors)', selectors, vals, fakeTransformations));

        // run instructions
        vals = _.reduce(transformations, function(vals, transformation, i) {
            let nextVals;
            // transformation wants array
            if (transformation.manyToOne) {
                const nextVal = _this.tryOrUndefined(transformation, vals);
                nextVals = [nextVal];
            }
            // 'transformation' is actually many transformations: one per value
            else if (_.isArray(transformation)) {
                if (vals.length !== transformation.length) {
                    throw new Error(`Mismatching number of arguments (${vals.length}) and transformations (${transformation.length})`);
                }
                nextVals = _.zipWith(transformation, vals, function(transformation, val) {
                    const nextVal = _this.tryOrUndefined(transformation, val);
                    return nextVal;
                });
            }
            else {
                // transformation wants individual values
                nextVals = _.map(vals, (val) => _this.tryOrUndefined(transformation, val));
            }
            _this._stacktrace.push(new StacktraceStep(i, vals, nextVals, transformation)); // debugging
            return nextVals;
        }, vals);

        if (vals.length !== 1) {
            throw new Error(`Transformation must always result in 1 value (got ${vals.length})`)
        }
        if (vals[0] instanceof NoValueError) {
            vals[0] = undefined;
        }
        return vals[0];
    }

    tryOrUndefined(fn, val) {
        // If errors exist that the fn doesn't want, don't run the fn but simply pass the errors through
        if (_.isArray(val)) {
            const err = _.find(val, (val) => val instanceof NoValueError);
            if (err && !fn.acceptsErrors) {
                return err;
            }
        }
        if (val instanceof NoValueError && !fn.acceptsErrors) {
            return val;
        }

       try {
            return fn.call(this, val);
        } catch (e) {
            if (e instanceof RequiredError) { // Internal error that should abort evaluation
                throw e;
            }
            return new NoValueError(); // Placeholder error; pass along in computation
        }
    }
}

class HtmlEvaluator extends Evaluator {
    constructor(data) {
        super(data);
        if (!_.isFunction(data)) {
            throw new Error("HtmlEvaluator: data must be cheerio document");
        }
    }
    get(selector) {
        const el = this.data(selector);
        if (el && el.length) {
            return el.text();
        }
        return new NoValueError();
    }
}


module.exports = {
    HtmlEvaluator: HtmlEvaluator,
    Evaluator: Evaluator
};
