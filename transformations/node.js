'use strict';
/**
 * Transformation functions for nodes
 * "Node" means a specific part of the given data
 * E.g. a HTML node, XML node, JSON object
 */


const {curry} = require('./utils');

function get(path, el, i) {
    return this.get(path, el);
}
get = curry(get);

function nodeText(el, i) {
    console.log('el', el.text());
    return this.nodeText(el);
}
nodeText = curry(nodeText);

function nodeChildren(el, i) {
    return this.nodeChildren(el);
}
nodeChildren.oneToMany = true;
nodeChildren = curry(nodeChildren);

module.exports = {
    get: get,
    nodeText: nodeText,
    nodeChildren: nodeChildren
};
