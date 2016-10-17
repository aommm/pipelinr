'use strict';
/**
 * The Pipelinr library
 * Exports 'Evaluator' and 'HtmlEvaluator' for evaluating pipelines
 */

const _ = require('lodash');
const cheerio = require('cheerio');

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
            // console.log("vals:", vals);
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


module.exports = {
    HtmlEvaluator: HtmlEvaluator,
    Evaluator: Evaluator
};
