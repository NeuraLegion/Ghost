"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("assert/strict"));
const service_1 = require("../../../../../../core/server/services/recommendations/service");
describe('Recommendation', function () {
    describe('validate', function () {
        it('Throws for an empty title', function () {
            strict_1.default.throws(() => {
                service_1.Recommendation.validate({
                    title: '',
                    description: null,
                    excerpt: null,
                    featuredImage: null,
                    favicon: null,
                    url: 'https://example.com',
                    oneClickSubscribe: false
                });
            }, {
                name: 'ValidationError',
                message: 'Title must not be empty'
            });
        });
        it('Throws for a long title', function () {
            strict_1.default.throws(() => {
                service_1.Recommendation.validate({
                    title: 'a'.repeat(2001),
                    description: null,
                    excerpt: null,
                    featuredImage: null,
                    favicon: null,
                    url: 'https://example.com',
                    oneClickSubscribe: false
                });
            }, {
                name: 'ValidationError',
                message: 'Title must be less than 2000 characters'
            });
        });
        it('Throws for a long description', function () {
            strict_1.default.throws(() => {
                service_1.Recommendation.validate({
                    title: 'Test',
                    description: 'a'.repeat(201),
                    excerpt: null,
                    featuredImage: null,
                    favicon: null,
                    url: 'https://example.com',
                    oneClickSubscribe: false
                });
            }, {
                name: 'ValidationError',
                message: 'Description must be less than 200 characters'
            });
        });
    });
    describe('clean', function () {
        it('sets createdAt ms to 0', function () {
            const recommendation = service_1.Recommendation.create({
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                url: 'https://example.com',
                oneClickSubscribe: false,
                createdAt: new Date('2021-01-01T00:00:05Z')
            });
            strict_1.default.equal(recommendation.createdAt.getMilliseconds(), 0);
        });
        it('sets updatedAt ms to 0', function () {
            const recommendation = service_1.Recommendation.create({
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                url: 'https://example.com',
                oneClickSubscribe: false,
                updatedAt: new Date('2021-01-01T00:00:05Z')
            });
            strict_1.default.equal(recommendation.updatedAt.getMilliseconds(), 0);
        });
        it('sets empty description to null', function () {
            const recommendation = service_1.Recommendation.create({
                title: 'Test',
                description: '',
                excerpt: null,
                featuredImage: null,
                favicon: null,
                url: 'https://example.com',
                oneClickSubscribe: false,
                updatedAt: new Date('2021-01-01T00:00:05Z')
            });
            strict_1.default.equal(recommendation.description, null);
        });
        it('sets empty excerpt to null', function () {
            const recommendation = service_1.Recommendation.create({
                title: 'Test',
                description: null,
                excerpt: '',
                featuredImage: null,
                favicon: null,
                url: 'https://example.com',
                oneClickSubscribe: false,
                updatedAt: new Date('2021-01-01T00:00:05Z')
            });
            strict_1.default.equal(recommendation.excerpt, null);
        });
        it('truncates long excerpts', function () {
            const recommendation = service_1.Recommendation.create({
                title: 'Test',
                description: null,
                excerpt: 'a'.repeat(2001),
                featuredImage: null,
                favicon: null,
                url: 'https://example.com',
                oneClickSubscribe: false,
                updatedAt: new Date('2021-01-01T00:00:05Z')
            });
            strict_1.default.equal(recommendation.excerpt?.length, 2000);
        });
        it('keeps search and hash params', function () {
            const recommendation = service_1.Recommendation.create({
                title: 'Test',
                description: '',
                excerpt: null,
                featuredImage: null,
                favicon: null,
                url: 'https://example.com/?query=1#hash',
                oneClickSubscribe: false,
                updatedAt: new Date('2021-01-01T00:00:05Z')
            });
            strict_1.default.equal(recommendation.url.toString(), 'https://example.com/?query=1#hash');
        });
    });
    describe('plain', function () {
        it('does not return instance of self', function () {
            const recommendation = service_1.Recommendation.create({
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                url: 'https://example.com',
                oneClickSubscribe: false,
                createdAt: new Date('2021-01-01T00:00:05Z')
            });
            strict_1.default.equal(recommendation.plain instanceof service_1.Recommendation, false);
        });
    });
    describe('edit', function () {
        it('can edit known properties', function () {
            const recommendation = service_1.Recommendation.create({
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                url: 'https://example.com',
                oneClickSubscribe: false,
                createdAt: new Date('2021-01-01T00:00:05Z'),
                updatedAt: null
            });
            recommendation.edit({
                title: 'Updated'
            });
            strict_1.default.equal(recommendation.title, 'Updated');
            strict_1.default.notEqual(recommendation.updatedAt, null);
        });
        it('does not change updatedAt if nothing changed', function () {
            const recommendation = service_1.Recommendation.create({
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                url: 'https://example.com',
                oneClickSubscribe: false,
                createdAt: new Date('2021-01-01T00:00:05Z'),
                updatedAt: null
            });
            strict_1.default.equal(recommendation.updatedAt, null);
            recommendation.edit({
                title: 'Test',
                url: undefined
            });
            strict_1.default.equal(recommendation.title, 'Test');
            strict_1.default.equal(recommendation.url.toString(), 'https://example.com/');
            strict_1.default.equal(recommendation.updatedAt, null);
        });
        it('can not edit unknown properties', function () {
            const recommendation = service_1.Recommendation.create({
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                url: 'https://example.com',
                oneClickSubscribe: false,
                createdAt: new Date('2021-01-01T00:00:05Z'),
                updatedAt: null
            });
            recommendation.edit({
                bla: true
            });
            strict_1.default.notEqual(recommendation.updatedAt, null);
            strict_1.default.equal(recommendation.bla, undefined);
        });
    });
    describe('delete', function () {
        it('can delete', function () {
            const recommendation = service_1.Recommendation.create({
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                url: 'https://example.com',
                oneClickSubscribe: false,
                createdAt: new Date('2021-01-01T00:00:05Z'),
                updatedAt: null
            });
            strict_1.default.equal(recommendation.deleted, false);
            recommendation.delete();
            strict_1.default.equal(recommendation.deleted, true);
        });
    });
});
