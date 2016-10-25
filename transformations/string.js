'use strict';

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

module.exports = {
    trim: trim,
    toLowerCase: toLowerCase,
    toUpperCase: toUpperCase
};
