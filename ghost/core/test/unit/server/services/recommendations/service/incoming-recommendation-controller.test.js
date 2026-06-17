"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("assert/strict"));
const service_1 = require("../../../../../../core/server/services/recommendations/service");
const sinon_1 = __importDefault(require("sinon"));
describe('IncomingRecommendationController', function () {
    let service;
    let controller;
    beforeEach(function () {
        service = {};
        controller = new service_1.IncomingRecommendationController({ service: service });
    });
    describe('browse', function () {
        beforeEach(function () {
            service.listIncomingRecommendations = async () => {
                return {
                    incomingRecommendations: [
                        {
                            id: '1',
                            title: 'Test 1',
                            url: new URL('https://test1.com'),
                            excerpt: 'Excerpt 1',
                            favicon: new URL('https://test1.com/favicon.ico'),
                            featuredImage: new URL('https://test1.com/image.png'),
                            recommendingBack: true
                        },
                        {
                            id: '2',
                            title: 'Test 2',
                            url: new URL('https://test2.com'),
                            excerpt: 'Excerpt 2',
                            favicon: null,
                            featuredImage: null,
                            recommendingBack: false
                        }
                    ],
                    meta: {
                        pagination: {
                            page: 1,
                            limit: 5,
                            pages: 1,
                            total: 2,
                            next: null,
                            prev: null
                        }
                    }
                };
            };
        });
        it('without options', async function () {
            const result = await controller.browse({
                data: {},
                options: {}
            });
            strict_1.default.deepEqual(result, {
                data: [{
                        id: '1',
                        title: 'Test 1',
                        excerpt: 'Excerpt 1',
                        featured_image: 'https://test1.com/image.png',
                        favicon: 'https://test1.com/favicon.ico',
                        url: 'https://test1.com/',
                        recommending_back: true
                    },
                    {
                        id: '2',
                        title: 'Test 2',
                        excerpt: 'Excerpt 2',
                        featured_image: null,
                        favicon: null,
                        url: 'https://test2.com/',
                        recommending_back: false
                    }],
                meta: {
                    pagination: {
                        page: 1,
                        limit: 5,
                        pages: 1,
                        total: 2,
                        next: null,
                        prev: null
                    }
                }
            });
        });
        describe('with options', function () {
            let listSpy;
            beforeEach(function () {
                listSpy = sinon_1.default.spy(service, 'listIncomingRecommendations');
            });
            it('limit is set to 5 by default', async function () {
                await controller.browse({
                    data: {},
                    options: {}
                });
                sinon_1.default.assert.calledOnce(listSpy);
                const args = listSpy.getCall(0).args[0];
                strict_1.default.deepEqual(args.limit, 5);
            });
            it('limit can be set to 100', async function () {
                await controller.browse({
                    data: {},
                    options: {
                        limit: 100
                    }
                });
                sinon_1.default.assert.calledOnce(listSpy);
                const args = listSpy.getCall(0).args[0];
                strict_1.default.deepEqual(args.limit, 100);
            });
            it('limit cannot be set to "all"', async function () {
                await strict_1.default.rejects(controller.browse({
                    data: {},
                    options: {
                        limit: 'all'
                    }
                }), {
                    message: 'limit must be an integer'
                });
            });
            it('page is set to 1 by default', async function () {
                await controller.browse({
                    data: {},
                    options: {}
                });
                sinon_1.default.assert.calledOnce(listSpy);
                const args = listSpy.getCall(0).args[0];
                strict_1.default.deepEqual(args.page, 1);
            });
            it('page can be set to 2', async function () {
                await controller.browse({
                    data: {},
                    options: {
                        page: 2
                    }
                });
                sinon_1.default.assert.calledOnce(listSpy);
                const args = listSpy.getCall(0).args[0];
                strict_1.default.deepEqual(args.page, 2);
            });
        });
    });
});
