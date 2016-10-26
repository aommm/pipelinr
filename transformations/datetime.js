'use strict';

const moment = require('moment');
const _ = require('lodash');
const {curry} = require('./utils');

/**
 * Creates a new moment
 * @param {String|String[]} format - one or many formats to try
 * @param {String} x - string to parse
 * @returns {moment}
 */
function parse(format, x) {
    const m = moment(x, format);
    return m;
}
parse = curry(parse);

/**
 * Combines many moments into one
 * If one moment contains "YYYY-MM-DD" and one contains "HH:mm", this will produce "YYYY-MM-DDTHH:mm"
 * If overlapping content, will pick the one with the most data
 * E.g. "2016-01-01 10:00" + "9:00:01" => "2016-01-01 10:00:01"
 * @param {moment[]}
 * @returns {moment}
 */
function combine(ms) {
    if (
        !_.isArray(ms) ||
        !ms.every(m => m instanceof moment)
    ) {
        throw new Error(`combine: must be given array of moment objects, got ${ms}`);
    }

    // returns a list of the indices this 'date parts' array covers
    // E.g. [2010, {empty}, 10] -> [0,2]
    function coveredIndices(parts) {
        return _.reject(_.map(parts, function (v, k) {
            if (_.isFinite(v)) {
                return k;
            }
            return null;
        }), _.isNull);
    }

    // Repeatedly take date parts from the moment with the most new information, until no new information can be found
    // (~Set cover problem)
    const dateParts = [];
    while (true) {
        const bestMoment = _.maxBy(ms, function (m) {
            const newKeys = _.difference(coveredIndices(m.parsingFlags().parsedDateParts), coveredIndices(dateParts));
            return newKeys.length; // maxBy number of covered indices that wasn't covered previously
        });
        const bestParts = bestMoment.parsingFlags().parsedDateParts;
        const newIndices = _.difference(coveredIndices(bestParts), coveredIndices(dateParts));
        if (!newIndices.length) {
            break;
        }
        for (const i of newIndices) {
            dateParts[i] = bestParts[i];
        }
    }

    // Construct new moment from date parts
    // TODO: handle gaps in array somehow
    const m = moment(dateParts);
    return m;
}

module.exports = {
    parse: parse,
    combine: combine
};
