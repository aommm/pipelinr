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
                return [transformation(vals)];
            }
            // 'transformation' is actually many transformations: one per value
            if (_.isArray(transformation)) {
                if (vals.length !== transformation.length) {
                    throw new Error(`Mismatching number of arguments (${vals.length}) and transformations (${transformation.length})`);
                }
                return _.zipWith(transformation, vals, function(transformation, val) {
                    return transformation(val);
                });
            }
            // transformation wants individual values
            return _.map(vals, transformation);
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
        return el && el.text();
    }
}

return co(function*() {
    const trim = (x) => x.trim();
    const toLowerCase = (x) => x.toLowerCase();
    const toUpperCase = (x) => x.toUpperCase();
    const concat = (xs) => _.reduce(xs, (acc, x) => acc + x);
    concat.manyToOne = true;
    const head = (xs) => xs[0];
    head.manyToOne = true;

    const transformations = [
        '.itemlist .athing:nth-child(1)',
        '.itemlist > tr:nth-child(2) > td:nth-child(2)',
        [toLowerCase, toUpperCase],
        //trim,
        //head,
        //concat,
        trim
    ];

    const [response, body] = yield request('https://news.ycombinator.com/');
    const htmlEvaluator = new HtmlEvaluator(body);
    const res = htmlEvaluator.eval(transformations);
    console.log("res:", res);
}).catch(function(x) {
    console.error('err', x);
});

