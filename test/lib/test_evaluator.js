'use strict';

const _ = require('lodash');

const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;
require('co-mocha');

const lib = require('../../lib');
const error = require('../../lib/error');
const Evaluator = lib.Evaluator;
const NoValueError = error.NoValueError;

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

        it('starts the flow with undefined', function () {
            const fn = sinon.stub();
            testEvaluator.eval([fn]);
            expect(fn.called).to.be.true;
            expect(fn.args[0]).to.deep.equal([undefined, 0]);
        });
        it('starts the flow with array of undefined', function () {
            const fn1 = sinon.stub();
            const fn2 = sinon.stub();
            testEvaluator.eval([[fn1, fn2]]);
            expect(fn1.called).to.be.true;
            expect(fn1.args[0]).to.deep.equal([undefined, 0]);
            expect(fn2.called).to.be.true;
            expect(fn2.args[0]).to.deep.equal([undefined, 1]);
        });

        describe('passes returned values to next function', function () {
            it('for single values', function () {
                const fn1 = sinon.stub().returns(1);
                const fn2 = sinon.stub();
                Object.defineProperty(fn1, 'length', {value: 2});
                Object.defineProperty(fn2, 'length', {value: 2});
                testEvaluator.eval([fn1, fn2]);
                expect(fn1.called).to.be.true;
                expect(fn2.called).to.be.true;
                expect(fn2.args[0][0]).to.deep.equal(1);
            });
            it('for arrays', function () {
                const fn1 = sinon.stub();
                const fn2 = sinon.stub();
                const fn3 = sinon.stub();
                Object.defineProperty(fn1, 'length', {value: 2});
                Object.defineProperty(fn2, 'length', {value: 2});
                Object.defineProperty(fn3, 'length', {value: 2});
                testEvaluator.eval([
                    () => [1,2,3],
                    [fn1, fn2, fn3]
                ]);
                expect(fn1.called).to.be.true;
                expect(fn2.called).to.be.true;
                expect(fn1.args[0][0]).to.deep.equal(1);
                expect(fn2.args[0][0]).to.deep.equal(2);
                expect(fn3.args[0][0]).to.deep.equal(3);
            });


        });

        it('results in "undefined" if transformation fails', function () {
            function evilFn() {
                const obj = 5;
                return obj();
            }
            const result = testEvaluator.eval([evilFn]);
            expect(result).to.be.undefined;
        });

        describe('always removes "NoValueError"s', function () {
            it('from single value', function () {
                const result = testEvaluator.eval([
                    () => new NoValueError()
                ]);
                expect(result).to.be.undefined;
            });
            it('from array', function () {
                const result = testEvaluator.eval([
                    () => [new NoValueError(), "hej"]
                ]);
                expect(result).to.be.deep.equal([undefined, "hej"]);
            });
            it('from object', function () {
                const obj = {a: new NoValueError(), b: "hej"};
                const result = testEvaluator.eval([
                    () => obj
                ]);
                expect(result).to.be.deep.equal({a: undefined, b: "hej"});
            });
            it('from object (with circular references)', function () {
                const circularObj = {
                    a: new NoValueError()
                };
                circularObj['b'] = circularObj;
                const result = testEvaluator.eval([
                    () => circularObj
                ]);
                expect(result).to.be.deep.equal({a: undefined, b: circularObj});
            });
        });


    })
});