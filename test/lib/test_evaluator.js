'use strict';

const _ = require('lodash');

const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;
require('co-mocha');

const lib = require('../../lib');
const Evaluator = lib.Evaluator;

describe('Evaluator', function () {

    class TestEvaluator extends Evaluator {
        get() {}
        nodeText() {}
        nodeChildren() {}
    }

    let testEvaluator;
    beforeEach(function () {
        testEvaluator = new TestEvaluator();
        testEvaluator.get = sinon.stub();
        testEvaluator.nodeText = sinon.stub();
        testEvaluator.nodeChildren = sinon.stub();
    });

    describe('_translate', function () {
        it('translates "selector" to array', function () {
            const transformations = testEvaluator._translate("hello");
            expect(transformations).to.be.instanceOf(Array);
            expect(transformations.length).to.be.equal(1);
        });
        it('translates ["selector"] to [flow]', function () {
            const transformations = testEvaluator._translate(["hello"]);
            expect(transformations).to.be.instanceOf(Array);
            expect(transformations.length).to.equal(1);
            expectFlowGet(transformations[0]);
        });
        it('translates [["selector", fn, "selector2"]] to [[flow, fn, flow]]', function () {
            function noop() {}
            const transformations = testEvaluator._translate([["hello", noop, "hello2"]]);
            expect(transformations).to.be.instanceOf(Array);
            expect(transformations.length).to.equal(1);
            expect(transformations[0].length).to.equal(3);
            expectFlowGet(transformations[0][0]);
            expect(transformations[0][1].toString()).to.equal(noop.toString()); // does not touch
            expectFlowGet(transformations[0][2]);
        });

        // Expect fn to be flow([get(...), nodeText])
        function expectFlowGet(fn) {
            expect(fn.name).to.equal('flow');
            expect(fn.args[0][0].name).to.equal('get');
            expect(fn.args[0][1].name).to.equal('nodeText');
        }
    });

    describe('eval', function () {
        it('calls _translate', function () {
            sinon.spy(testEvaluator, '_translate');
            testEvaluator.eval('hello');
            expect(testEvaluator._translate.called).to.be.true;
            expect(testEvaluator._translate.args[0]).to.deep.equal(['hello']);
        });
        it('calls _validate', function () {
            sinon.spy(testEvaluator, '_validate');
            testEvaluator.eval('hello');
            expect(testEvaluator._validate.called).to.be.true;
        });

    })
});