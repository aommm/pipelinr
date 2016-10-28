'use strict';

const {curry} = require('./utils');

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
function split(sep, x) {
    return x.split(sep);
}
split = curry(split);

module.exports = {
    trim: trim,
    toLowerCase: toLowerCase,
    toUpperCase: toUpperCase,
    split: split
};
