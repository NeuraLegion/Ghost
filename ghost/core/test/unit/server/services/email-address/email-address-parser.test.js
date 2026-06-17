"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("assert/strict"));
const email_address_parser_js_1 = __importDefault(require("../../../../../core/server/services/email-address/email-address-parser.js"));
describe('EmailAddressParser', function () {
    describe('parse', function () {
        it('should parse an email address', function () {
            const email = email_address_parser_js_1.default.parse('test@example.com');
            strict_1.default.ok(email);
            strict_1.default.deepEqual(email, {
                address: 'test@example.com',
                name: undefined
            });
        });
        it('should parse an email address with a name', function () {
            const email = email_address_parser_js_1.default.parse('"Test User" <test@example.com>');
            strict_1.default.ok(email);
            strict_1.default.deepEqual(email, {
                address: 'test@example.com',
                name: 'Test User'
            });
        });
        it('should parse an email address with a name and a comment', function () {
            const email = email_address_parser_js_1.default.parse('"Test User" <test@example.com> (Comment)');
            strict_1.default.ok(email);
            strict_1.default.deepEqual(email, {
                address: 'test@example.com',
                name: 'Test User'
            });
        });
        it('should handle an invalid email address', function () {
            const email = email_address_parser_js_1.default.parse('invalid');
            strict_1.default.deepEqual(email, {
                address: '',
                name: 'invalid'
            });
        });
        it('should handle an invalid email address with a name', function () {
            const email = email_address_parser_js_1.default.parse('"Test User" <invalid>');
            strict_1.default.deepEqual(email, {
                address: 'invalid',
                name: 'Test User'
            });
        });
        it('should return null for empty input', function () {
            const email = email_address_parser_js_1.default.parse('');
            strict_1.default.equal(email, null);
        });
        it('should return null for null input', function () {
            // @ts-ignore - Testing null input
            const email = email_address_parser_js_1.default.parse(null);
            strict_1.default.equal(email, null);
        });
        it('should return null for undefined input', function () {
            // @ts-ignore - Testing undefined input
            const email = email_address_parser_js_1.default.parse(undefined);
            strict_1.default.equal(email, null);
        });
        it('should return null for multiple email addresses', function () {
            const email = email_address_parser_js_1.default.parse('test1@example.com, test2@example.com');
            strict_1.default.equal(email, null);
        });
        it('should return null for group format', function () {
            const email = email_address_parser_js_1.default.parse('My Group: test@example.com;');
            strict_1.default.equal(email, null);
        });
    });
    describe('stringify', function () {
        it('should stringify an email address', function () {
            const email = email_address_parser_js_1.default.stringify({
                address: 'test@example.com',
                name: 'Test User'
            });
            strict_1.default.equal(email, '"Test User" <test@example.com>');
        });
        it('should stringify an email address without a name', function () {
            const email = email_address_parser_js_1.default.stringify({
                address: 'test@example.com'
            });
            strict_1.default.equal(email, 'test@example.com');
        });
        it('it should remove unsupported characters from the name', function () {
            const email = email_address_parser_js_1.default.stringify({
                address: 'test@example.com',
                name: 'This is my awesome name ✅ ✓ ✔ ☑ 🗸'
            });
            strict_1.default.equal(email, '"This is my awesome name" <test@example.com>');
        });
    });
});
