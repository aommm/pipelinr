'use strict';

const _ = require('lodash');
const {curry} = require('./utils');

const concat = (xs) => xs.join('');

function join (sep, xs) { // Many-to-one AND generic
    return xs.join(sep);
}
join = curry(join);

function head(xs) {
    return xs[0];
}

function chunk(n, xs) {
    return _.chunk(xs, n);
}
chunk.manyToMany = true;
chunk = curry(chunk);

function flatten(xs) {
    return _.flatten(xs);
}

function drop(n, xs) {
    return _.drop(n, xs);
}
drop = curry(drop);

module.exports = {
    concat: concat,
    join: join,
    head: head,
    chunk: chunk,
    flatten: flatten,
    drop: drop
};
