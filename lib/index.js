'use strict';
/**
 * The Pipelinr library
 * Exports 'Evaluator' and 'HtmlEvaluator' for evaluating pipelines
 */

const _ = require('lodash');
const cheerio = require('cheerio');

const NoValueError = require('./error').NoValueError;
const RequiredError = require('./error').RequiredError;
const PipelineValidationError = require('./error').PipelineValidationError;
const Stacktrace = require('./error').Stacktrace;
const StacktraceStep = require('./error').StacktraceStep;

const {flow} = require('../transformations/control-flow');
const nodeTransformations = require('../transformations/node');
const get = nodeTransformations.get;
const nodeText = nodeTransformations.nodeText;
// {, nodeText, nodeChildren} = nodeTransformations;

class Evaluator {
    constructor(data) {
        this.data = data;
        // validation of inheriting classes
        const methods = ['get', 'nodeText', 'nodeChildren'];
        if (methods.some((method) => !_.isFunction(this[method]))) {
            throw new Error(`Evaluator must implement all methods: ${methods}`)
        }
    }

    /**
     * Translates transformations from shorthand to proper syntax
     * (E.g. 'selector' -> [[fn]])
     * @param {Array} transformations
     * @returns {Array} transformations
     * @private
     */
    _translate(transformations) {
        transformations = _.cloneDeep(transformations);
        // 'a' -> ['a']
        if (!_.isArray(transformations)) {
            transformations = [transformations];
        }

        // 'a' is shorthand for "get the text contents from node at path 'a'"
        // ['a', fn, 'b'] -> [getNodeAndText, fn, getNodeAndText]
        function replaceStringByTransform(obj, k) {
            if (_.isString(obj[k])) {
                const path = obj[k];
                obj[k] = flow([get(path), nodeText]);
            }
        }
        if (_.isArray(transformations[0])) {
            transformations[0].forEach((t, k) => replaceStringByTransform(transformations[0], k));
        } else {
            replaceStringByTransform(transformations, 0);
        }

        return transformations;
    }

    /**
     * Checks so that the given transformations are valid. If not, throws exception
     * @param transformations
     * @throws PipelineValidationError - if validation fails
     * @private
     */
    _validate(transformations) {
        transformations = _.cloneDeep(transformations);
        transformations.shift(); // remove selectors
        for (const i in transformations) {
            const transformation = transformations[i];
            if (_.isArray(transformation)) {
                this._validate(transformation);
            } else if (_.isFunction(transformation)) {
                if (transformation.length < 1) {
                    throw new PipelineValidationError(`PipelineValidationError in step ${i}:`+
                        `\nTransformation "${transformation.name}" takes 0 arguments, but should take 1 or 2. Possible reasons:`+
                        `\n* No argument names were declared (should be "function myTransformation(x, i) {...}")`+
                        `\n* Too many config parameters were given (for example join("sep", "I am wrong"))`+
                        `\nFunction:\n${transformation.toString()}`+
                        `\nApplied to: ${JSON.stringify(transformation.args)}`);
                } else if (transformation.length > 2) {
                    throw new PipelineValidationError(`PipelineValidationError in step ${i}:`+
                        `\nTransformation "${transformation.name}" takes ${transformation.length} arguments, but should take 1 or 2.`+
                        `\nMaybe you forgot to provide some config parameters? (i.e. "join" rather than "join('sep')"`+
                        `\nFunction:\n${transformation.toString()}`+
                        `\nApplied to: ${JSON.stringify(transformation.args)}`);
                }
            } else {
                throw new PipelineValidationError(`PipelineValidationError in step ${i}:`+
                    `\nTransformation is not a function.`+
                    `\nMaybe you supplied too many config parameters? (i.e. "join('sep','x')" rather than "join('sep')"`+
                    `\nTransformation:\n${JSON.stringify(transformation)}`);
            }
        }
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
        _this._validate(transformations);

        let initialVal;
        if (_.isArray(transformations[0])) {
            initialVal = _.fill(Array(transformations[0].length), undefined); // workaround, curried fns need all arguments supplied
        } else {
            initialVal = undefined;
        }
        // run instructions
        const val = _.reduce(transformations, function(val, transformation, i) {
            let nextVal;
            // 'transformation' is array, try to destructure input values
            if (_.isArray(transformation)) {
                if (val.length !== transformation.length) {
                    throw new Error(`Mismatching number of arguments (${val.length}) and transformations (${transformation.length})`);
                }
                nextVal = _.zipWith(transformation, val, function(transformation, val, i) {
                    const nextVal = _this.tryOrUndefined(transformation, val, i);
                    return nextVal;
                });
            }
            else {
                nextVal = _this.tryOrUndefined(transformation, val, 0);
            }
            _this._stacktrace.push(new StacktraceStep(i, val, nextVal, transformation)); // debugging
            console.log(_this._stacktrace[_this._stacktrace.length-1]);
            return nextVal;
        }, initialVal);

        replaceWithUndefined(val);
        return val;
    }

    /**
     * Tries to run fn(val, i), catching any possible errors and returning them as NoValueError
     * @param fn
     * @param val
     * @param {number} i
     * @returns {*} result of fn(val, i)
     */
    tryOrUndefined(fn, val, i) {
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
            return fn.call(this, val, i);
        } catch (e) {
            if (e instanceof RequiredError) { // Internal error that should abort evaluation
                throw e;
            }
            // console.log("e:", e);
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
    get(selector, el) {
        let find;

        if (el) {
            find = el.find.bind(el);
        } else {
            if (this.data.bind) {
                find = this.data.bind(this.data);
            } else { // workaround for cheerio < 0.18
                find = Function.prototype.bind.call(this.data, this.data);
            }
        }

        const foundEl = find(selector);
        if (foundEl && foundEl.length) {
            return foundEl;
        }
        return new NoValueError();
    }
    nodeText(el) {
        return el.text();
    }
    nodeChildren(el) {
        let x = el.children();
        x = _.map(x, cheerio);
        return x;
    }
}

/**
 * Sanitizes obj recursively, replacing NoValueError with undefined
 * @param obj
 */
function replaceWithUndefined(obj, visited) {
    if (!visited) {
        visited = [];
    }

    for (const k in obj) {
        if (visited.indexOf(obj[k]) >= 0) {
            continue;
        } else {
            visited.push(obj[k]);
        }
        if (obj[k] instanceof NoValueError) {
            obj[k] = undefined;
        } else if (_.isArray(obj[k]) || _.isPlainObject(obj[k])) {
            replaceWithUndefined(obj[k], visited);
        }
    }
}


module.exports = {
    HtmlEvaluator: HtmlEvaluator,
    Evaluator: Evaluator
};
