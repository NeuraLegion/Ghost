"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("assert/strict"));
const service_1 = require("../../../../../../core/server/services/recommendations/service");
const in_memory_repository_1 = require("../../../../../../core/server/services/lib/in-memory-repository");
const sinon_1 = __importDefault(require("sinon"));
class InMemoryClickEventRepository extends in_memory_repository_1.InMemoryRepository {
    toPrimitive(entity) {
        return entity;
    }
}
describe('RecommendationService', function () {
    let service;
    let enabled = false;
    let clock;
    let fetchMetadataStub;
    beforeEach(function () {
        enabled = false;
        fetchMetadataStub = sinon_1.default.stub().resolves({
            title: 'Test',
            excerpt: null,
            featuredImage: null,
            favicon: null,
            oneClickSubscribe: false
        });
        service = new service_1.RecommendationService({
            repository: new service_1.InMemoryRecommendationRepository(),
            clickEventRepository: new InMemoryClickEventRepository(),
            subscribeEventRepository: new InMemoryClickEventRepository(),
            wellknownService: {
                getPath() {
                    return '';
                },
                getURL() {
                    return new URL('http://localhost/.well-known/recommendations.json');
                },
                set() {
                    return Promise.resolve();
                }
            },
            mentionSendingService: {
                sendAll() {
                    return Promise.resolve();
                }
            },
            recommendationEnablerService: {
                getSetting() {
                    return enabled.toString();
                },
                setSetting(e) {
                    enabled = e === 'true';
                    return Promise.resolve();
                }
            },
            recommendationMetadataService: {
                fetch: fetchMetadataStub
            }
        });
        clock = sinon_1.default.useFakeTimers();
    });
    afterEach(function () {
        sinon_1.default.restore();
        clock.restore();
    });
    describe('init', function () {
        it('should update wellknown', async function () {
            const updateWellknown = sinon_1.default.stub(service.wellknownService, 'set').resolves();
            await service.init();
            sinon_1.default.assert.calledOnce(updateWellknown);
        });
        it('should update recommendations on boot', async function () {
            const recommendation = service_1.Recommendation.create({
                id: '2',
                url: 'http://localhost/1',
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            await service.repository.save(recommendation);
            // Sandbox time
            const saved = process.env.NODE_ENV;
            try {
                process.env.NODE_ENV = 'development';
                const spy = sinon_1.default.spy(service, 'updateAllRecommendationsMetadata');
                await service.init();
                await clock.tick(1000 * 60 * 60 * 24);
                sinon_1.default.assert.calledOnce(spy);
            }
            finally {
                process.env.NODE_ENV = saved;
            }
        });
        it('ignores errors when update recommendations on boot', async function () {
            // Sandbox time
            const saved = process.env.NODE_ENV;
            try {
                process.env.NODE_ENV = 'development';
                const spy = sinon_1.default.stub(service, 'updateAllRecommendationsMetadata');
                spy.rejects(new Error('test'));
                await service.init();
                clock.tick(1000 * 60 * 60 * 24);
                sinon_1.default.assert.calledOnce(spy);
            }
            finally {
                process.env.NODE_ENV = saved;
            }
        });
        it('should errors when update recommendations on boot (invidiual)', async function () {
            const recommendation = service_1.Recommendation.create({
                id: '2',
                url: 'http://localhost/1',
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            await service.repository.save(recommendation);
            // Sandbox time
            const saved = process.env.NODE_ENV;
            try {
                process.env.NODE_ENV = 'development';
                const spy = sinon_1.default.stub(service, '_updateRecommendationMetadata');
                spy.rejects(new Error('This is a test'));
                await service.init();
                clock.tick(1000 * 60 * 60 * 24);
                clock.restore();
                // This assert doesn't work without a timeout because the timeout in boot is async
                // eslint-disable-next-line no-promise-executor-return
                await new Promise((resolve) => {
                    setTimeout(() => resolve(true), 50);
                });
                sinon_1.default.assert.calledOnce(spy);
            }
            finally {
                process.env.NODE_ENV = saved;
            }
        });
    });
    describe('checkRecommendation', function () {
        it('Returns existing recommendation if found', async function () {
            const recommendation = service_1.Recommendation.create({
                id: '2',
                url: 'http://localhost/existing',
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            await service.repository.save(recommendation);
            const response = await service.checkRecommendation(new URL('http://localhost/existing'));
            strict_1.default.deepEqual(response, recommendation.plain);
        });
        it('Returns updated recommendation if found', async function () {
            const recommendation = service_1.Recommendation.create({
                id: '2',
                url: 'http://localhost/existing',
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            // Force an empty title (shouldn't be possible)
            recommendation.title = '';
            await service.repository.save(recommendation);
            fetchMetadataStub.resolves({
                title: 'Test 2',
                excerpt: 'Test excerpt',
                featuredImage: new URL('https://example.com/image.png'),
                favicon: new URL('https://example.com/favicon.ico'),
                oneClickSubscribe: true
            });
            const response = await service.checkRecommendation(new URL('http://localhost/existing'));
            strict_1.default.deepEqual(response, {
                ...recommendation.plain,
                // Note: Title only changes if it was empty
                title: 'Test 2',
                description: null,
                excerpt: 'Test excerpt',
                featuredImage: new URL('https://example.com/image.png'),
                favicon: new URL('https://example.com/favicon.ico'),
                oneClickSubscribe: true
            });
        });
        it('Returns updated recommendation if found but keeps empty title if no title found', async function () {
            const recommendation = service_1.Recommendation.create({
                id: '2',
                url: 'http://localhost/existing',
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            // Force an empty title (shouldn't be possible)
            recommendation.title = '';
            await service.repository.save(recommendation);
            fetchMetadataStub.resolves({
                title: null,
                excerpt: 'Test excerpt',
                featuredImage: new URL('https://example.com/image.png'),
                favicon: new URL('https://example.com/favicon.ico'),
                oneClickSubscribe: true
            });
            const response = await service.checkRecommendation(new URL('http://localhost/existing'));
            // No changes here, because validation failed with an empty title
            strict_1.default.deepEqual(response, {
                ...recommendation.plain
            });
        });
        it('Returns existing recommendation if found and fetch failes', async function () {
            const recommendation = service_1.Recommendation.create({
                id: '2',
                url: 'http://localhost/existing',
                title: 'Outdated title',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            await service.repository.save(recommendation);
            fetchMetadataStub.rejects(new Error('Test'));
            const response = await service.checkRecommendation(new URL('http://localhost/existing'));
            strict_1.default.deepEqual(response, recommendation.plain);
        });
        it('Returns recommendation metadata if not found', async function () {
            const response = await service.checkRecommendation(new URL('http://localhost/newone'));
            strict_1.default.deepEqual(response, {
                title: 'Test',
                excerpt: undefined,
                featuredImage: undefined,
                favicon: undefined,
                oneClickSubscribe: false,
                url: new URL('http://localhost/newone')
            });
        });
        it('Returns recommendation metadata if not found with all data except title', async function () {
            fetchMetadataStub.resolves({
                title: null,
                excerpt: 'Test excerpt',
                featuredImage: new URL('https://example.com/image.png'),
                favicon: new URL('https://example.com/favicon.ico'),
                oneClickSubscribe: true
            });
            const response = await service.checkRecommendation(new URL('http://localhost/newone'));
            strict_1.default.deepEqual(response, {
                title: undefined,
                excerpt: 'Test excerpt',
                featuredImage: new URL('https://example.com/image.png'),
                favicon: new URL('https://example.com/favicon.ico'),
                oneClickSubscribe: true,
                url: new URL('http://localhost/newone')
            });
        });
        it('Returns undefined recommendation metadata if metadata fails to fetch', async function () {
            fetchMetadataStub.rejects(new Error('Metadata failed to fetch'));
            const response = await service.checkRecommendation(new URL('http://localhost/newone'));
            strict_1.default.deepEqual(response, {
                title: undefined,
                excerpt: undefined,
                featuredImage: undefined,
                favicon: undefined,
                oneClickSubscribe: false,
                url: new URL('http://localhost/newone')
            });
        });
    });
    describe('updateRecommendationsEnabledSetting', function () {
        it('should set to true if more than one', async function () {
            enabled = false;
            await service.updateRecommendationsEnabledSetting([
                service_1.Recommendation.create({
                    url: 'http://localhost/1',
                    title: 'Test',
                    description: null,
                    excerpt: null,
                    featuredImage: null,
                    favicon: null,
                    oneClickSubscribe: false
                })
            ]);
            (0, strict_1.default)(enabled);
        });
        it('should keep enabled true if already enabled', async function () {
            enabled = true;
            await service.updateRecommendationsEnabledSetting([
                service_1.Recommendation.create({
                    url: 'http://localhost/1',
                    title: 'Test',
                    description: null,
                    excerpt: null,
                    featuredImage: null,
                    favicon: null,
                    oneClickSubscribe: false
                })
            ]);
            (0, strict_1.default)(enabled);
        });
        it('should set to false if none', async function () {
            enabled = false;
            await service.updateRecommendationsEnabledSetting([]);
            strict_1.default.equal(enabled, false);
        });
        it('should set to false if none if currently enabled', async function () {
            enabled = true;
            await service.updateRecommendationsEnabledSetting([]);
            strict_1.default.equal(enabled, false);
        });
    });
    describe('readRecommendation', function () {
        it('throws if not found', async function () {
            await strict_1.default.rejects(() => service.readRecommendation('1'), {
                name: 'NotFoundError',
                message: 'Recommendation with id 1 not found'
            });
        });
        it('returns plain if found', async function () {
            const recommendation = service_1.Recommendation.create({
                id: '2',
                url: 'http://localhost/1',
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            await service.repository.save(recommendation);
            const response = await service.readRecommendation('2');
            strict_1.default.deepEqual(response, recommendation.plain);
            // Check not instance of Recommendation
            strict_1.default.equal(response instanceof service_1.Recommendation, false);
        });
    });
    describe('addRecommendation', function () {
        it('throws if already exists', async function () {
            const recommendation = service_1.Recommendation.create({
                id: '2',
                url: 'http://localhost/1',
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            await service.repository.save(recommendation);
            await strict_1.default.rejects(() => service.addRecommendation({
                url: 'http://localhost/1',
                title: 'Test 2',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            }), {
                name: 'ValidationError',
                message: 'A recommendation with this URL already exists.'
            });
        });
        it('returns plain if sucessful', async function () {
            const response = await service.addRecommendation({
                url: 'http://localhost/1',
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            strict_1.default.deepEqual(response, {
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false,
                clickCount: undefined,
                subscriberCount: undefined,
                updatedAt: null,
                // Ignored
                url: response.url,
                id: response.id,
                createdAt: response.createdAt
            });
            (0, strict_1.default)(response.id);
            (0, strict_1.default)(response.url);
            (0, strict_1.default)(response.createdAt);
            (0, strict_1.default)(response.url instanceof URL);
            (0, strict_1.default)(response.createdAt instanceof Date);
        });
        it('does not throw if sendMentionToRecommendation throws', async function () {
            const recommendation = service_1.Recommendation.create({
                id: '2',
                url: 'http://localhost/1',
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            const updateRecommendationsEnabledSetting = sinon_1.default.stub(service.mentionSendingService, 'sendAll').rejects(new Error('Test'));
            await service.repository.save(recommendation);
            await strict_1.default.doesNotReject(() => service.addRecommendation({
                url: 'http://localhost/2',
                title: 'Test 2',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            }));
            sinon_1.default.assert.calledOnce(updateRecommendationsEnabledSetting);
        });
    });
    describe('editRecommendation', function () {
        it('throws if not found', async function () {
            await strict_1.default.rejects(() => service.editRecommendation('1', {
                title: 'Test 2'
            }), {
                name: 'NotFoundError',
                message: 'Recommendation with id 1 not found'
            });
        });
        it('returns plain if sucessful', async function () {
            const recommendation = service_1.Recommendation.create({
                id: '2',
                url: 'http://localhost/1',
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            await service.repository.save(recommendation);
            const response = await service.editRecommendation('2', {
                title: 'Test 2'
            });
            strict_1.default.deepEqual(response, {
                title: 'Test 2',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false,
                clickCount: undefined,
                subscriberCount: undefined,
                // Ignored
                url: response.url,
                id: response.id,
                createdAt: response.createdAt,
                updatedAt: response.updatedAt
            });
            (0, strict_1.default)(response.id);
            (0, strict_1.default)(response.url);
            (0, strict_1.default)(response.createdAt);
            (0, strict_1.default)(response.updatedAt);
            (0, strict_1.default)(response.url instanceof URL);
            (0, strict_1.default)(response.createdAt instanceof Date);
            (0, strict_1.default)(response.updatedAt instanceof Date);
        });
    });
    describe('deleteRecommendation', function () {
        it('throws if not found', async function () {
            await strict_1.default.rejects(() => service.deleteRecommendation('1'), {
                name: 'NotFoundError',
                message: 'Recommendation with id 1 not found'
            });
        });
        it('deletes if found', async function () {
            const recommendation = service_1.Recommendation.create({
                id: '2',
                url: 'http://localhost/1',
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            await service.repository.save(recommendation);
            strict_1.default.equal(await service.repository.getCount({}), 1);
            await service.deleteRecommendation('2');
            strict_1.default.equal(await service.repository.getCount({}), 0);
        });
    });
    describe('listRecommendations', function () {
        it('returns plain if sucessful', async function () {
            const recommendation = service_1.Recommendation.create({
                id: '2',
                url: 'http://localhost/1',
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            await service.repository.save(recommendation);
            const response = await service.listRecommendations();
            strict_1.default.equal(response.length, 1);
            strict_1.default.equal(response[0] instanceof service_1.Recommendation, false);
        });
        it('returns pages', async function () {
            const recommendation = service_1.Recommendation.create({
                id: '2',
                url: 'http://localhost/1',
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            await service.repository.save(recommendation);
            const recommendation2 = service_1.Recommendation.create({
                id: '3',
                url: 'http://localhost/2',
                title: 'Test 2',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            await service.repository.save(recommendation2);
            const response = await service.listRecommendations({
                limit: 1,
                order: [
                    {
                        field: 'id',
                        direction: 'desc'
                    }
                ]
            });
            strict_1.default.equal(response.length, 1);
            strict_1.default.equal(response[0].id, '3');
            strict_1.default.equal(response[0] instanceof service_1.Recommendation, false);
        });
        it('uses a default limit and page', async function () {
            const recommendation = service_1.Recommendation.create({
                id: '2',
                url: 'http://localhost/1',
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            await service.repository.save(recommendation);
            const recommendation2 = service_1.Recommendation.create({
                id: '3',
                url: 'http://localhost/2',
                title: 'Test 2',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            await service.repository.save(recommendation2);
            const response = await service.listRecommendations({});
            strict_1.default.equal(response.length, 2);
            strict_1.default.equal(response[0] instanceof service_1.Recommendation, false);
            strict_1.default.equal(response[1] instanceof service_1.Recommendation, false);
        });
    });
    describe('countRecommendations', function () {
        it('returns count', async function () {
            const recommendation = service_1.Recommendation.create({
                id: '2',
                url: 'http://localhost/1',
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            await service.repository.save(recommendation);
            strict_1.default.equal(await service.countRecommendations({}), 1);
        });
    });
    describe('trackClicked', function () {
        it('adds click event', async function () {
            await service.trackClicked({ id: '1' });
            strict_1.default.equal(await service.clickEventRepository.getCount({}), 1);
        });
    });
    describe('trackSubscribed', function () {
        it('adds subscribe event', async function () {
            await service.trackSubscribed({ id: '1', memberId: '1' });
            strict_1.default.equal(await service.subscribeEventRepository.getCount({}), 1);
        });
    });
    describe('readRecommendationByUrl', function () {
        it('returns if found', async function () {
            const recommendation = service_1.Recommendation.create({
                id: '2',
                url: 'http://localhost/1',
                title: 'Test',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                oneClickSubscribe: false
            });
            await service.repository.save(recommendation);
            const response = await service.readRecommendationByUrl(new URL('http://localhost/1'));
            strict_1.default.deepEqual(response, recommendation.plain);
        });
        it('returns null if not found', async function () {
            const response = await service.readRecommendationByUrl(new URL('http://localhost/1'));
            strict_1.default.equal(response, null);
        });
    });
});
