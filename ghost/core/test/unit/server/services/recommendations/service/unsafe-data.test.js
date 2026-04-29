"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("assert/strict"));
const unsafe_data_1 = require("../../../../../../core/server/services/recommendations/service/unsafe-data");
describe('UnsafeData', function () {
    describe('optionalKey', function () {
        it('Returns data for a valid key', function () {
            const data = new unsafe_data_1.UnsafeData({ foo: 'bar' });
            strict_1.default.deepEqual(data.optionalKey('foo'), new unsafe_data_1.UnsafeData('bar', {
                field: ['foo']
            }));
        });
        it('Extends the context fields', function () {
            const data = new unsafe_data_1.UnsafeData({ foo: 'bar' }, { field: ['baz'] });
            strict_1.default.deepEqual(data.optionalKey('foo'), new unsafe_data_1.UnsafeData('bar', {
                field: ['baz', 'foo']
            }));
        });
        it('Throws for null', function () {
            const data = new unsafe_data_1.UnsafeData(null);
            strict_1.default.throws(() => {
                data.optionalKey('foo');
            }, { message: 'data must be an object' });
        });
        it('Throws for non-objects', function () {
            const data = new unsafe_data_1.UnsafeData(15, { field: ['baz'] });
            strict_1.default.throws(() => {
                data.optionalKey('foo');
            }, { message: 'baz must be an object' });
        });
        it('Returns undefined if the property does not exist', function () {
            const data = new unsafe_data_1.UnsafeData({ foo: 'bar' });
            strict_1.default.equal(data.optionalKey('baz'), undefined);
        });
        it('Returns undefined if the property was inherited from a parent', function () {
            const data = new unsafe_data_1.UnsafeData(new Date());
            strict_1.default.equal(data.optionalKey('getTime'), undefined);
        });
    });
    describe('key', function () {
        it('Returns data for a valid key', function () {
            const data = new unsafe_data_1.UnsafeData({ foo: 'bar' });
            strict_1.default.deepEqual(data.key('foo'), new unsafe_data_1.UnsafeData('bar', {
                field: ['foo']
            }));
        });
        it('Extends the context fields', function () {
            const data = new unsafe_data_1.UnsafeData({ foo: 'bar' }, { field: ['baz'] });
            strict_1.default.deepEqual(data.key('foo'), new unsafe_data_1.UnsafeData('bar', {
                field: ['baz', 'foo']
            }));
        });
        it('Throws for null', function () {
            const data = new unsafe_data_1.UnsafeData(null);
            strict_1.default.throws(() => {
                data.key('foo');
            }, { message: 'data must be an object' });
        });
        it('Throws for non-objects', function () {
            const data = new unsafe_data_1.UnsafeData(15, { field: ['baz'] });
            strict_1.default.throws(() => {
                data.key('foo');
            }, { message: 'baz must be an object' });
        });
        it('Throws if the property does not exist', function () {
            const data = new unsafe_data_1.UnsafeData({ foo: 'bar' });
            strict_1.default.throws(() => {
                data.key('baz');
            }, { message: 'baz is required' });
        });
        it('Throws if the property does not exist with context', function () {
            const data = new unsafe_data_1.UnsafeData({ foo: 'bar' }, { field: ['bar'] });
            strict_1.default.throws(() => {
                data.key('baz');
            }, { message: 'bar.baz is required' });
        });
    });
    describe('nullable', function () {
        it('Returns data if not null', function () {
            const data = new unsafe_data_1.UnsafeData({ foo: 'bar' });
            strict_1.default.equal(data.nullable, data);
        });
        it('Returns proxy if null', function () {
            const data = new unsafe_data_1.UnsafeData(null);
            strict_1.default.notEqual(data.nullable, data);
            strict_1.default.equal(data.nullable.string, null);
            strict_1.default.equal(data.nullable.boolean, null);
            strict_1.default.equal(data.nullable.number, null);
            strict_1.default.equal(data.nullable.integer, null);
            strict_1.default.equal(data.nullable.url, null);
            strict_1.default.equal(data.nullable.enum(['foo', 'bar']), null);
            const n = data.nullable;
            strict_1.default.equal(n.key('test'), n);
            strict_1.default.equal(data.nullable.key('test').string, null);
            strict_1.default.equal(data.nullable.optionalKey('test').string, null);
            strict_1.default.equal(data.nullable.array, null);
            strict_1.default.equal(data.nullable.index(0).string, null);
        });
    });
    describe('string', function () {
        it('Returns if a string', function () {
            const data = new unsafe_data_1.UnsafeData('hello world');
            strict_1.default.equal(data.string, 'hello world');
        });
        it('Returns if an empty string', function () {
            const data = new unsafe_data_1.UnsafeData('');
            strict_1.default.equal(data.string, '');
        });
        it('Throws if a number', function () {
            const data = new unsafe_data_1.UnsafeData(15);
            strict_1.default.throws(() => {
                data.string;
            }, { message: 'data must be a string' });
        });
        it('Throws if an object', function () {
            const data = new unsafe_data_1.UnsafeData({});
            strict_1.default.throws(() => {
                data.string;
            }, { message: 'data must be a string' });
        });
        it('Throws if null', function () {
            const data = new unsafe_data_1.UnsafeData(null, { field: ['obj', 'test'] });
            strict_1.default.throws(() => {
                data.string;
            }, { message: 'obj.test must be a string' });
        });
    });
    describe('boolean', function () {
        it('Returns if true', function () {
            const data = new unsafe_data_1.UnsafeData(true);
            strict_1.default.equal(data.boolean, true);
        });
        it('Returns if false', function () {
            const data = new unsafe_data_1.UnsafeData(false);
            strict_1.default.equal(data.boolean, false);
        });
        it('Throws if 0', function () {
            const data = new unsafe_data_1.UnsafeData(0);
            strict_1.default.throws(() => {
                data.boolean;
            }, { message: 'data must be a boolean' });
        });
        it('Throws if 1', function () {
            const data = new unsafe_data_1.UnsafeData(1);
            strict_1.default.throws(() => {
                data.boolean;
            }, { message: 'data must be a boolean' });
        });
        it('Throws if an object', function () {
            const data = new unsafe_data_1.UnsafeData({});
            strict_1.default.throws(() => {
                data.boolean;
            }, { message: 'data must be a boolean' });
        });
        it('Throws if null', function () {
            const data = new unsafe_data_1.UnsafeData(null, { field: ['obj', 'test'] });
            strict_1.default.throws(() => {
                data.boolean;
            }, { message: 'obj.test must be a boolean' });
        });
    });
    describe('number', function () {
        it('Returns if a number', function () {
            const data = new unsafe_data_1.UnsafeData(15);
            strict_1.default.equal(data.number, 15);
        });
        it('Returns if 0', function () {
            const data = new unsafe_data_1.UnsafeData(0);
            strict_1.default.equal(data.number, 0);
        });
        it('Returns if floating point', function () {
            const data = new unsafe_data_1.UnsafeData(0.33);
            strict_1.default.equal(data.number, 0.33);
        });
        it('Returns if -1', function () {
            const data = new unsafe_data_1.UnsafeData(-1);
            strict_1.default.equal(data.number, -1);
        });
        it('Throws if NaN', function () {
            const data = new unsafe_data_1.UnsafeData(NaN);
            strict_1.default.throws(() => {
                data.number;
            }, { message: 'data must be a finite number' });
        });
        it('Throws if Infinity', function () {
            const data = new unsafe_data_1.UnsafeData(Infinity);
            strict_1.default.throws(() => {
                data.number;
            }, { message: 'data must be a finite number' });
        });
        it('Converts from string', function () {
            const data = new unsafe_data_1.UnsafeData('15');
            strict_1.default.equal(data.number, 15);
        });
        it('Converts from float string', function () {
            const data = new unsafe_data_1.UnsafeData('15.33');
            strict_1.default.equal(data.number, 15.33);
        });
        it('Throws if convert from string number with spaces', function () {
            const data = new unsafe_data_1.UnsafeData('15 ');
            strict_1.default.throws(() => {
                data.number;
            }, { message: 'data must be a number, got string' });
        });
        it('Throws if a string', function () {
            const data = new unsafe_data_1.UnsafeData('hello world');
            strict_1.default.throws(() => {
                data.number;
            }, { message: 'data must be a number, got string' });
        });
        it('Throws if an object', function () {
            const data = new unsafe_data_1.UnsafeData({});
            strict_1.default.throws(() => {
                data.number;
            }, { message: 'data must be a number, got object' });
        });
        it('Throws if null', function () {
            const data = new unsafe_data_1.UnsafeData(null, { field: ['obj', 'test'] });
            strict_1.default.throws(() => {
                data.number;
            }, { message: 'obj.test must be a number, got object' });
        });
    });
    describe('integer', function () {
        it('Returns if a number', function () {
            const data = new unsafe_data_1.UnsafeData(15);
            strict_1.default.equal(data.integer, 15);
        });
        // Other tests
        it('Throws if floating point', function () {
            const data = new unsafe_data_1.UnsafeData(0.33);
            strict_1.default.throws(() => {
                data.integer;
            }, { message: 'data must be an integer' });
        });
        it('Returns if -1', function () {
            const data = new unsafe_data_1.UnsafeData(-1);
            strict_1.default.equal(data.integer, -1);
        });
        it('Throws if NaN', function () {
            const data = new unsafe_data_1.UnsafeData(NaN);
            strict_1.default.throws(() => {
                data.integer;
            }, { message: 'data must be a finite number' });
        });
        it('Throws if Infinity', function () {
            const data = new unsafe_data_1.UnsafeData(Infinity);
            strict_1.default.throws(() => {
                data.integer;
            }, { message: 'data must be a finite number' });
        });
        it('Converts from string', function () {
            const data = new unsafe_data_1.UnsafeData('15');
            strict_1.default.equal(data.integer, 15);
        });
        it('Throws if convert from float string', function () {
            const data = new unsafe_data_1.UnsafeData('15.33', { field: ['bar'] });
            strict_1.default.throws(() => {
                data.integer;
            }, { message: 'bar must be an integer' });
        });
        it('Throws if convert from string number with text', function () {
            const data = new unsafe_data_1.UnsafeData('15 test', { field: ['bar'] });
            strict_1.default.throws(() => {
                data.integer;
            }, { message: 'bar must be an integer' });
        });
        it('Throws if a string', function () {
            const data = new unsafe_data_1.UnsafeData('hello world');
            strict_1.default.throws(() => {
                data.integer;
            }, { message: 'data must be an integer' });
        });
        it('Throws if an object', function () {
            const data = new unsafe_data_1.UnsafeData({});
            strict_1.default.throws(() => {
                data.integer;
            }, { message: 'data must be a number, got object' });
        });
        it('Throws if null', function () {
            const data = new unsafe_data_1.UnsafeData(null, { field: ['obj', 'test'] });
            strict_1.default.throws(() => {
                data.integer;
            }, { message: 'obj.test must be a number, got object' });
        });
        it('Throws if too high', function () {
            const data = new unsafe_data_1.UnsafeData(Math.pow(2, 53), { field: ['bar'] });
            strict_1.default.throws(() => {
                data.integer;
            }, { message: 'bar must be an integer' });
        });
    });
    describe('url', function () {
        it('Returns if a URL object', function () {
            const u = new URL('https://example.com');
            const data = new unsafe_data_1.UnsafeData(u);
            strict_1.default.equal(data.url, u);
        });
        it('Returns if a URL', function () {
            const data = new unsafe_data_1.UnsafeData('https://example.com/path?query=string');
            strict_1.default.equal(data.url.toString(), 'https://example.com/path?query=string');
        });
        it('Returns if a http URL', function () {
            const data = new unsafe_data_1.UnsafeData('http://example.com');
            strict_1.default.equal(data.url.toString(), 'http://example.com/');
        });
        it('Throws if a ftp URL', function () {
            const data = new unsafe_data_1.UnsafeData('ftp://example.com');
            strict_1.default.throws(() => {
                data.url;
            }, { message: 'data must be a valid URL' });
        });
        it('Throws if a string', function () {
            const data = new unsafe_data_1.UnsafeData('hello world');
            strict_1.default.throws(() => {
                data.url;
            }, { message: 'data must be a valid URL' });
        });
        it('Throws if an object', function () {
            const data = new unsafe_data_1.UnsafeData({});
            strict_1.default.throws(() => {
                data.url;
            }, { message: 'data must be a string' });
        });
        it('Throws if null', function () {
            const data = new unsafe_data_1.UnsafeData(null, { field: ['obj', 'test'] });
            strict_1.default.throws(() => {
                data.url;
            }, { message: 'obj.test must be a string' });
        });
    });
    describe('enum', function () {
        it('Returns if a valid value', function () {
            const data = new unsafe_data_1.UnsafeData('foo');
            strict_1.default.equal(data.enum(['foo', 'bar']), 'foo');
        });
        it('Works for numbers too', function () {
            const data = new unsafe_data_1.UnsafeData(5);
            strict_1.default.equal(data.enum([5, 8]), 5);
        });
        it('Throws if an invalid value', function () {
            const data = new unsafe_data_1.UnsafeData('baz');
            strict_1.default.throws(() => {
                data.enum(['foo', 'bar']);
            }, { message: 'data must be one of foo, bar' });
        });
    });
    describe('array', function () {
        it('Returns if an array', function () {
            const data = new unsafe_data_1.UnsafeData(['foo', 'bar']);
            strict_1.default.equal(data.array[0].string, 'foo');
            strict_1.default.equal(data.array[1].string, 'bar');
        });
        it('Extends context', function () {
            const data = new unsafe_data_1.UnsafeData(['foo', 'bar'], { field: ['baz'] });
            strict_1.default.deepEqual(data.array[0], new unsafe_data_1.UnsafeData('foo', { field: ['baz', '0'] }));
            strict_1.default.deepEqual(data.array[1], new unsafe_data_1.UnsafeData('bar', { field: ['baz', '1'] }));
        });
        it('Throws if not an array', function () {
            const data = new unsafe_data_1.UnsafeData('baz');
            strict_1.default.throws(() => {
                data.array;
            }, { message: 'data must be an array' });
        });
    });
    describe('index', function () {
        it('Returns if an array', function () {
            const data = new unsafe_data_1.UnsafeData(['foo', 'bar']);
            strict_1.default.equal(data.index(0).string, 'foo');
        });
        it('Extends context', function () {
            const data = new unsafe_data_1.UnsafeData(['foo', 'bar'], { field: ['baz'] });
            strict_1.default.deepEqual(data.index(0), new unsafe_data_1.UnsafeData('foo', { field: ['baz', '0'] }));
            strict_1.default.deepEqual(data.index(1), new unsafe_data_1.UnsafeData('bar', { field: ['baz', '1'] }));
        });
        it('Throws if not an array', function () {
            const data = new unsafe_data_1.UnsafeData('baz');
            strict_1.default.throws(() => {
                data.index(0);
            }, { message: 'data must be an array' });
        });
        it('Throws if out of bounds', function () {
            const data = new unsafe_data_1.UnsafeData(['foo', 'bar']);
            strict_1.default.throws(() => {
                data.index(2);
            }, { message: 'data must be an array of length 3' });
        });
        it('Throws if out of lower bounds', function () {
            const data = new unsafe_data_1.UnsafeData(['foo', 'bar']);
            strict_1.default.throws(() => {
                data.index(-1);
            }, { message: 'index must be a positive integer' });
        });
        it('Throws if floating point', function () {
            const data = new unsafe_data_1.UnsafeData(['foo', 'bar']);
            strict_1.default.throws(() => {
                data.index(1.5);
            }, { message: 'index must be a positive integer' });
        });
        it('Throws if NaN', function () {
            const data = new unsafe_data_1.UnsafeData(['foo', 'bar']);
            strict_1.default.throws(() => {
                data.index(NaN);
            }, { message: 'index must be a positive integer' });
        });
    });
});
