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

const {required, defaultValue, forNth, exceptNth, forAll} = require('./transformations/control-flow');
const {concat, join, head, chunk, flatten} = require('./transformations/list');
const {trim, toLowerCase, toUpperCase} = require('./transformations/string');
const get = require('./transformations/node').get;
const nodeText = require('./transformations/node').nodeText;
const nodeChildren = require('./transformations/node').nodeChildren;
const curry = require('./transformations/utils').curry;
const HtmlEvaluator = require('./lib').HtmlEvaluator;
const NoValueError = require('./lib/error').NoValueError;

co(function*() {

    const log = console.log.bind(console);

    // -----------------------------------
    // Create pipeline and run
    const transformations1 = [
        ['.itemlist .athing:nth-child(1)',
        '.itemlist > tr:nth-child(2) > td:nth-child(2)',
        'brokenSelector'],
        [toLowerCase, toUpperCase, toUpperCase],
        forAll(trim),
        // forAll(log),
        forNth(2, defaultValue("hej")),
        forAll(required),
        join('\n'),
        // required
    ];

    const transformations2 = [
        get('#hnmain > tr:nth-child(3) > td > table'),
        nodeChildren,
        chunk(3),
        forAll(head),
        flatten,
        forAll(nodeText),
        forAll(trim)
    ];
    const transformations3 = [
        get('#hnmain > tr:nth-child(3) > td > table'),
        nodeChildren,
        chunk(3),
        forAll(head),
        flatten,
        forAll(get('td:nth-child(3)')),
        forAll(nodeText),

        // forEach(head),
        // nodeText,
        // trim
    ];

    const transformations4 = [
        _.constant([1,2,3]),
        _.sum
        // toLowerCase
    ];

    const [response, body] = yield request('https://news.ycombinator.com/');
    const htmlEvaluator = new HtmlEvaluator(cheerio.load(body));
    const res = htmlEvaluator.eval(transformations1);
    console.log("result from evaluating pipeline:\n", res);
}).catch(function(x) {
    console.error('err', x.stack);
});

