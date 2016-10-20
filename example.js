'use strict';
/**
 * Some examples of how to use Pipelinr
 */

const _ = require('lodash');
const cheerio = require('cheerio');
const co = require('co');
const bb = require('bluebird');
let request = require('request');
request = bb.promisify(request, {multiArgs: true});

const {required, nth, exceptNth} = require('./transformations/control-flow');
const get = require('./transformations/node').get;
const nodeText = require('./transformations/node').nodeText;
const nodeChildren = require('./transformations/node').nodeChildren;
const curry = require('./transformations/utils').curry;
const HtmlEvaluator = require('./lib').HtmlEvaluator;
const NoValueError = require('./lib/error').NoValueError;

co(function*() {

    // -----------------------------------
    // One-to-one transformations (a -> b)

    // Some string transformations
    function trim (x) {
        return x.trim();
    }
    function toLowerCase (x) {
        return x.toLowerCase();
    }
    function toUpperCase (x) {
        return x.toUpperCase();
    }

    // Transformations can be provided with "options" (== multiple arguments)
    function defaultValue (def, x) {
        return x instanceof NoValueError ? def : x;
    }
    defaultValue.acceptsErrors = true;
    defaultValue = curry(defaultValue);

    // defaultValue is now a generic transformer, that we configure by calling. E.g.:
    // defaultValue(0, undefined) === 0
    // defaultValue(0)(undefined) === 0
    // defaultValue(0, 'smthing') === 'smthing'
    // defaultValue(0)('smthing') === 'smthing'
    // 'curry' is the magic that allows this syntax, see https://lodash.com/docs/4.16.4#curry for details

    // -----------------------------------
    // Many-to-one transformations ([a,b,c] -> d)

    const concat = (xs) => xs.join('');
    concat.manyToOne = true;

    function join (sep, xs) { // Many-to-one AND generic
        return xs.join(sep);
    }
    join.manyToOne = true;
    join = curry(join);

    const head = (xs) => xs[0];
    head.manyToOne = true;

    function log(x) {
        console.log('logging:', x);
        return x;
    }
    log.acceptsErrors = true;

    function chunk(n, xs) {
        return _.chunk(xs, n);
    }
    chunk.manyToMany = true;
    chunk = curry(chunk);


    /**
     * Applies a many-to-x transformation several times
     * (useful when you want to transform nested arrays)
     * @param fn - many-to-many or many-to-one transformation
     * @param xs
     * @param i
     */
    function forEach(fn, xs, i) {
        return xs.map((x) => fn(x, i));
    }
    forEach.manyToMany = true;
    forEach = curry(forEach);

    // -----------------------------------
    // Create pipeline and run
    const transformations = [
        ['.itemlist .athing:nth-child(1)',
        '.itemlist > tr:nth-child(2) > td:nth-child(2)',
        'brokenSelector'],
        [toLowerCase, toUpperCase, toUpperCase],
        trim,
        // defaultValue("I am a default value"), // remove this to see stacktrace in action
        log,
        nth(1, defaultValue("hej")),
        // nth(2, defaultValue("hej")),
        join('\n')
        // required
    ];

    const transformations2 = [
        get('#hnmain > tr:nth-child(3) > td > table'),
        nodeChildren,
        head,
        chunk(3),
        forEach(head),
        nodeText,
        trim
    ];
    // const transformations3 = [
    //     get('#hnmain > tr:nth-child(3) > td > table'),
    //     nodeChildren,
    //     head,
    //     chunk(3),
    //     head,
    //     get('td:nth-child(1)'),
    //     nodeText,
    //
    //     // forEach(head),
    //     // nodeText,
    //     // trim
    // ];

    const [response, body] = yield request('https://news.ycombinator.com/');
    const htmlEvaluator = new HtmlEvaluator(cheerio.load(body));
    const res = htmlEvaluator.eval(transformations3);
    console.log("result from evaluating pipeline:\n", res);
}).catch(function(x) {
    console.error('err', x.stack);
});

