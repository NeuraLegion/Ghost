"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("assert/strict"));
const sinon_1 = __importDefault(require("sinon"));
const service_1 = require("../../../../../../core/server/services/recommendations/service");
describe('IncomingRecommendationService', function () {
    let service;
    let refreshMentions;
    let clock;
    let send;
    let readRecommendationByUrl;
    beforeEach(function () {
        refreshMentions = sinon_1.default.stub().resolves();
        send = sinon_1.default.stub().resolves();
        readRecommendationByUrl = sinon_1.default.stub().resolves(null);
        service = new service_1.IncomingRecommendationService({
            recommendationService: {
                readRecommendationByUrl
            },
            mentionsApi: {
                refreshMentions,
                listMentions: () => Promise.resolve({ data: [] })
            },
            emailService: {
                send
            },
            emailRenderer: {
                renderSubject: () => Promise.resolve(''),
                renderHTML: () => Promise.resolve(''),
                renderText: () => Promise.resolve('')
            },
            getEmailRecipients: () => Promise.resolve([
                {
                    email: 'example@example.com'
                }
            ])
        });
        clock = sinon_1.default.useFakeTimers();
    });
    afterEach(function () {
        sinon_1.default.restore();
        clock.restore();
    });
    describe('init', function () {
        it('should update incoming recommendations on boot', async function () {
            // Sandbox time
            const saved = process.env.NODE_ENV;
            try {
                process.env.NODE_ENV = 'nottesting';
                await service.init();
                clock.tick(1000 * 60 * 60 * 24);
                sinon_1.default.assert.calledOnce(refreshMentions);
                sinon_1.default.assert.calledWith(refreshMentions, {
                    filter: `source:~$'/.well-known/recommendations.json'+deleted:[true,false]`,
                    limit: 100
                });
            }
            finally {
                process.env.NODE_ENV = saved;
            }
        });
        it('ignores errors when update incoming recommendations on boot', async function () {
            // Sandbox time
            const saved = process.env.NODE_ENV;
            try {
                process.env.NODE_ENV = 'nottesting';
                refreshMentions.rejects(new Error('test'));
                await service.init();
                clock.tick(1000 * 60 * 60 * 24);
                sinon_1.default.assert.calledOnce(refreshMentions);
            }
            finally {
                process.env.NODE_ENV = saved;
            }
        });
    });
    describe('sendRecommendationEmail', function () {
        it('should send email', async function () {
            await service.sendRecommendationEmail({
                id: 'test',
                source: new URL('https://example.com'),
                sourceTitle: 'Example',
                sourceSiteTitle: 'Example',
                sourceAuthor: 'Example',
                sourceExcerpt: 'Example',
                sourceFavicon: new URL('https://example.com/favicon.ico'),
                sourceFeaturedImage: new URL('https://example.com/featured.png')
            });
            sinon_1.default.assert.calledOnce(send);
        });
        it('ignores when mention not convertable to incoming recommendation', async function () {
            readRecommendationByUrl.rejects(new Error('test'));
            await service.sendRecommendationEmail({
                id: 'test',
                source: new URL('https://example.com'),
                sourceTitle: 'Example',
                sourceSiteTitle: 'Example',
                sourceAuthor: 'Example',
                sourceExcerpt: 'Example',
                sourceFavicon: new URL('https://example.com/favicon.ico'),
                sourceFeaturedImage: new URL('https://example.com/featured.png')
            });
            sinon_1.default.assert.notCalled(send);
        });
    });
    describe('listIncomingRecommendations', function () {
        beforeEach(function () {
            refreshMentions = sinon_1.default.stub().resolves();
            send = sinon_1.default.stub().resolves();
            readRecommendationByUrl = sinon_1.default.stub().resolves(null);
            service = new service_1.IncomingRecommendationService({
                recommendationService: {
                    readRecommendationByUrl
                },
                mentionsApi: {
                    refreshMentions,
                    listMentions: () => Promise.resolve({ data: [
                            {
                                id: 'Incoming recommendation',
                                source: new URL('https://incoming-rec.com/.well-known/recommendations.json'),
                                sourceTitle: 'Incoming recommendation title',
                                sourceSiteTitle: null,
                                sourceAuthor: null,
                                sourceExcerpt: 'Incoming recommendation excerpt',
                                sourceFavicon: new URL('https://incoming-rec.com/favicon.ico'),
                                sourceFeaturedImage: new URL('https://incoming-rec.com/image.png')
                            }
                        ], meta: {
                            pagination: {
                                page: 1,
                                limit: 5,
                                pages: 1,
                                total: 1,
                                next: null,
                                prev: null
                            }
                        } })
                },
                emailService: {
                    send
                },
                emailRenderer: {
                    renderSubject: () => Promise.resolve(''),
                    renderHTML: () => Promise.resolve(''),
                    renderText: () => Promise.resolve('')
                },
                getEmailRecipients: () => Promise.resolve([
                    {
                        email: 'example@example.com'
                    }
                ])
            });
        });
        it('returns a list of incoming recommendations and pagination', async function () {
            const list = await service.listIncomingRecommendations({});
            strict_1.default.equal(list.incomingRecommendations.length, 1);
            strict_1.default.equal(list.incomingRecommendations[0].id, 'Incoming recommendation');
            strict_1.default.equal(list.incomingRecommendations[0].title, 'Incoming recommendation title');
            strict_1.default.equal(list.incomingRecommendations[0].excerpt, 'Incoming recommendation excerpt');
            strict_1.default.equal(list.incomingRecommendations[0].url.toString(), 'https://incoming-rec.com/');
            strict_1.default.equal(list.incomingRecommendations[0].favicon?.toString(), 'https://incoming-rec.com/favicon.ico');
            strict_1.default.equal(list.incomingRecommendations[0].featuredImage?.toString(), 'https://incoming-rec.com/image.png');
            strict_1.default.equal(list.meta?.pagination.page, 1);
            strict_1.default.equal(list.meta?.pagination.limit, 5);
            strict_1.default.equal(list.meta?.pagination.pages, 1);
            strict_1.default.equal(list.meta?.pagination.total, 1);
            strict_1.default.equal(list.meta?.pagination.prev, null);
            strict_1.default.equal(list.meta?.pagination.next, null);
        });
    });
});
