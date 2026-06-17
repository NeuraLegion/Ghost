"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("assert/strict"));
const service_1 = require("../../../../../../core/server/services/recommendations/service");
const sinon_1 = __importDefault(require("sinon"));
describe('BookshelfRecommendationRepository', function () {
    afterEach(function () {
        sinon_1.default.restore();
    });
    it('toPrimitive', async function () {
        const repository = new service_1.BookshelfRecommendationRepository({}, {
            sentry: undefined
        });
        strict_1.default.deepEqual(repository.toPrimitive(service_1.Recommendation.create({
            id: 'id',
            title: 'title',
            description: 'description',
            excerpt: 'excerpt',
            featuredImage: new URL('https://example.com'),
            favicon: new URL('https://example.com'),
            url: new URL('https://example.com'),
            oneClickSubscribe: true,
            createdAt: new Date('2021-01-01'),
            updatedAt: new Date('2021-01-02')
        })), {
            id: 'id',
            title: 'title',
            description: 'description',
            excerpt: 'excerpt',
            featured_image: 'https://example.com/',
            favicon: 'https://example.com/',
            url: 'https://example.com/',
            one_click_subscribe: true,
            created_at: new Date('2021-01-01'),
            updated_at: new Date('2021-01-02')
        });
    });
    it('modelToEntity', async function () {
        const repository = new service_1.BookshelfRecommendationRepository({}, {
            sentry: undefined
        });
        const entity = repository.modelToEntity({
            id: 'id',
            get: (key) => {
                return {
                    title: 'title',
                    description: 'description',
                    excerpt: 'excerpt',
                    featured_image: 'https://example.com/',
                    favicon: 'https://example.com/',
                    url: 'https://example.com/',
                    one_click_subscribe: true,
                    created_at: new Date('2021-01-01'),
                    updated_at: new Date('2021-01-02')
                }[key];
            }
        });
        strict_1.default.deepEqual(entity, service_1.Recommendation.create({
            id: 'id',
            title: 'title',
            description: 'description',
            excerpt: 'excerpt',
            featuredImage: new URL('https://example.com'),
            favicon: new URL('https://example.com'),
            url: new URL('https://example.com'),
            oneClickSubscribe: true,
            createdAt: new Date('2021-01-01'),
            updatedAt: new Date('2021-01-02')
        }));
    });
    it('modelToEntity returns null on errors', async function () {
        const captureException = sinon_1.default.stub();
        const repository = new service_1.BookshelfRecommendationRepository({}, {
            sentry: {
                captureException
            }
        });
        sinon_1.default.stub(service_1.Recommendation, 'create').throws(new Error('test'));
        const entity = repository.modelToEntity({
            id: 'id',
            get: () => {
                return null;
            }
        });
        strict_1.default.deepEqual(entity, null);
        sinon_1.default.assert.calledOnce(captureException);
    });
    it('getByUrl returns null if not found', async function () {
        const repository = new service_1.BookshelfRecommendationRepository({}, {
            sentry: undefined
        });
        const stub = sinon_1.default.stub(repository, 'getAll').returns(Promise.resolve([]));
        const entity = await repository.getByUrl(new URL('https://example.com'));
        strict_1.default.deepEqual(entity, null);
        sinon_1.default.assert.calledOnce(stub);
    });
    it('getByUrl returns null if not matching path', async function () {
        const repository = new service_1.BookshelfRecommendationRepository({}, {
            sentry: undefined
        });
        const recommendation = service_1.Recommendation.create({
            id: 'id',
            title: 'title',
            description: 'description',
            excerpt: 'excerpt',
            featuredImage: new URL('https://example.com'),
            favicon: new URL('https://example.com'),
            url: new URL('https://example.com/other-path'),
            oneClickSubscribe: true,
            createdAt: new Date('2021-01-01'),
            updatedAt: new Date('2021-01-02')
        });
        const stub = sinon_1.default.stub(repository, 'getAll').returns(Promise.resolve([
            recommendation
        ]));
        const entity = await repository.getByUrl(new URL('https://www.example.com/path'));
        strict_1.default.equal(entity, null);
        sinon_1.default.assert.calledOnce(stub);
    });
    it('getByUrl returns if matching hostname and pathname', async function () {
        const repository = new service_1.BookshelfRecommendationRepository({}, {
            sentry: undefined
        });
        const recommendation = service_1.Recommendation.create({
            id: 'id',
            title: 'title',
            description: 'description',
            excerpt: 'excerpt',
            featuredImage: new URL('https://example.com'),
            favicon: new URL('https://example.com'),
            url: new URL('https://example.com/path'),
            oneClickSubscribe: true,
            createdAt: new Date('2021-01-01'),
            updatedAt: new Date('2021-01-02')
        });
        const stub = sinon_1.default.stub(repository, 'getAll').returns(Promise.resolve([
            recommendation
        ]));
        const entity = await repository.getByUrl(new URL('https://www.example.com/path'));
        strict_1.default.equal(entity, recommendation);
        sinon_1.default.assert.calledOnce(stub);
    });
    it('getByUrl returns if matching hostname and pathname, but not query params', async function () {
        const repository = new service_1.BookshelfRecommendationRepository({}, {
            sentry: undefined
        });
        const recommendation = service_1.Recommendation.create({
            id: 'id',
            title: 'title',
            description: 'description',
            excerpt: 'excerpt',
            featuredImage: new URL('https://example.com'),
            favicon: new URL('https://example.com'),
            url: new URL('https://example.com/path'),
            oneClickSubscribe: true,
            createdAt: new Date('2021-01-01'),
            updatedAt: new Date('2021-01-02')
        });
        const stub = sinon_1.default.stub(repository, 'getAll').returns(Promise.resolve([
            recommendation
        ]));
        const entity = await repository.getByUrl(new URL('https://www.example.com/path/?query=param'));
        strict_1.default.equal(entity, recommendation);
        sinon_1.default.assert.calledOnce(stub);
    });
    it('getByUrl returns if matching hostname and pathname, but not hash fragments', async function () {
        const repository = new service_1.BookshelfRecommendationRepository({}, {
            sentry: undefined
        });
        const recommendation = service_1.Recommendation.create({
            id: 'id',
            title: 'title',
            description: 'description',
            excerpt: 'excerpt',
            featuredImage: new URL('https://example.com'),
            favicon: new URL('https://example.com'),
            url: new URL('https://example.com/path/#section1'),
            oneClickSubscribe: true,
            createdAt: new Date('2021-01-01'),
            updatedAt: new Date('2021-01-02')
        });
        const stub = sinon_1.default.stub(repository, 'getAll').returns(Promise.resolve([
            recommendation
        ]));
        const entity = await repository.getByUrl(new URL('https://www.example.com/path'));
        strict_1.default.equal(entity, recommendation);
        sinon_1.default.assert.calledOnce(stub);
    });
    it('getFieldToColumnMap returns', async function () {
        const captureException = sinon_1.default.stub();
        const repository = new service_1.BookshelfRecommendationRepository({}, {
            sentry: {
                captureException
            }
        });
        strict_1.default.ok(repository.getFieldToColumnMap());
    });
    it('applyCustomQuery returns', async function () {
        const captureException = sinon_1.default.stub();
        const repository = new service_1.BookshelfRecommendationRepository({}, {
            sentry: {
                captureException
            }
        });
        const builder = {
            select: function (arg) {
                if (typeof arg === 'function') {
                    arg(this);
                }
            },
            count: function () {
                return this;
            },
            from: function () {
                return this;
            },
            where: function () {
                return this;
            },
            as: function () {
                return this;
            },
            client: {
                raw: function () {
                    return '';
                }
            }
        };
        strict_1.default.doesNotThrow(() => {
            repository.applyCustomQuery(builder, {
                include: ['clickCount', 'subscriberCount']
            });
        });
        strict_1.default.doesNotThrow(() => {
            repository.applyCustomQuery(builder, {
                include: [],
                order: [
                    {
                        field: 'clickCount',
                        direction: 'asc'
                    },
                    {
                        field: 'subscriberCount',
                        direction: 'desc'
                    }
                ]
            });
        });
    });
});
