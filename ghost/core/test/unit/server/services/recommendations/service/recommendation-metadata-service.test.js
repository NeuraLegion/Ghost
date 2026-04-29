"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("assert/strict"));
const nock_1 = __importDefault(require("nock"));
const service_1 = require("../../../../../../core/server/services/recommendations/service");
const sinon_1 = __importDefault(require("sinon"));
const got = require('got').default;
describe('RecommendationMetadataService', function () {
    let service;
    let fetchOembedDataFromUrl;
    beforeEach(function () {
        nock_1.default.disableNetConnect();
        fetchOembedDataFromUrl = sinon_1.default.stub().resolves({
            version: '1.0',
            type: 'webmention',
            metadata: {
                title: 'Oembed Site Title',
                description: 'Oembed Site Description',
                publisher: 'Oembed Site Publisher',
                author: 'Oembed Site Author',
                thumbnail: 'https://example.com/oembed/thumbnail.png',
                icon: 'https://example.com/oembed/icon.png'
            }
        });
        service = new service_1.RecommendationMetadataService({
            externalRequest: got,
            oembedService: {
                fetchOembedDataFromUrl
            }
        });
    });
    afterEach(function () {
        nock_1.default.cleanAll();
        sinon_1.default.restore();
    });
    it('Returns metadata from the Ghost site', async function () {
        (0, nock_1.default)('https://exampleghostsite.com')
            .get('/subdirectory/members/api/site')
            .reply(200, {
            site: {
                title: 'Example Ghost Site',
                description: 'Example Ghost Site Description',
                cover_image: 'https://exampleghostsite.com/cover.png',
                icon: 'https://exampleghostsite.com/favicon.ico',
                allow_external_signup: true
            }
        });
        const metadata = await service.fetch(new URL('https://exampleghostsite.com/subdirectory'));
        strict_1.default.deepEqual(metadata, {
            title: 'Example Ghost Site',
            excerpt: 'Example Ghost Site Description',
            featuredImage: new URL('https://exampleghostsite.com/cover.png'),
            favicon: new URL('https://exampleghostsite.com/favicon.ico'),
            oneClickSubscribe: true
        });
    });
    it('Nulifies empty data from Ghost site response', async function () {
        (0, nock_1.default)('https://exampleghostsite.com')
            .get('/subdirectory/members/api/site')
            .reply(200, {
            site: {
                title: '',
                description: '',
                cover_image: '',
                icon: '',
                allow_external_signup: false
            }
        });
        const metadata = await service.fetch(new URL('https://exampleghostsite.com/subdirectory'));
        strict_1.default.deepEqual(metadata, {
            title: null,
            excerpt: null,
            featuredImage: null,
            favicon: null,
            oneClickSubscribe: false
        });
    });
    it('Ignores ghost site if allow_external_signup is missing', async function () {
        (0, nock_1.default)('https://exampleghostsite.com')
            .get('/members/api/site')
            .reply(200, {
            site: {
                title: '',
                description: '',
                cover_image: '',
                icon: ''
            }
        });
        const metadata = await service.fetch(new URL('https://exampleghostsite.com'));
        strict_1.default.deepEqual(metadata, {
            // oembed
            title: 'Oembed Site Title',
            excerpt: 'Oembed Site Description',
            featuredImage: new URL('https://example.com/oembed/thumbnail.png'),
            favicon: new URL('https://example.com/oembed/icon.png'),
            oneClickSubscribe: false
        });
    });
    it('Returns metadata from the Ghost site root if not found on subdirectory', async function () {
        (0, nock_1.default)('https://exampleghostsite.com')
            .get('/subdirectory/members/api/site')
            .reply(404, {});
        (0, nock_1.default)('https://exampleghostsite.com')
            .get('/members/api/site')
            .reply(200, {
            site: {
                title: 'Example Ghost Site',
                description: 'Example Ghost Site Description',
                cover_image: 'https://exampleghostsite.com/cover.png',
                icon: 'https://exampleghostsite.com/favicon.ico',
                allow_external_signup: true
            }
        });
        const metadata = await service.fetch(new URL('https://exampleghostsite.com/subdirectory'));
        strict_1.default.deepEqual(metadata, {
            title: 'Example Ghost Site',
            excerpt: 'Example Ghost Site Description',
            featuredImage: new URL('https://exampleghostsite.com/cover.png'),
            favicon: new URL('https://exampleghostsite.com/favicon.ico'),
            oneClickSubscribe: true
        });
    });
    it('Skips ghost metadata if json is invalid', async function () {
        (0, nock_1.default)('https://exampleghostsite.com')
            .get('/subdirectory/members/api/site')
            .reply(200, 'invalidjson');
        (0, nock_1.default)('https://exampleghostsite.com')
            .get('/members/api/site')
            .reply(200, 'invalidjson');
        const metadata = await service.fetch(new URL('https://exampleghostsite.com/subdirectory'));
        strict_1.default.deepEqual(metadata, {
            title: 'Oembed Site Title',
            excerpt: 'Oembed Site Description',
            featuredImage: new URL('https://example.com/oembed/thumbnail.png'),
            favicon: new URL('https://example.com/oembed/icon.png'),
            oneClickSubscribe: false
        });
    });
    it('Ignores invalid urls', async function () {
        (0, nock_1.default)('https://exampleghostsite.com')
            .get('/subdirectory/members/api/site')
            .reply(404, 'invalidjson');
        (0, nock_1.default)('https://exampleghostsite.com')
            .get('/members/api/site')
            .reply(404, 'invalidjson');
        fetchOembedDataFromUrl.resolves({
            version: '1.0',
            type: 'webmention',
            metadata: {
                title: 'Oembed Site Title',
                description: 'Oembed Site Description',
                publisher: 'Oembed Site Publisher',
                author: 'Oembed Site Author',
                thumbnail: 'invalid',
                icon: 'invalid'
            }
        });
        const metadata = await service.fetch(new URL('https://exampleghostsite.com/subdirectory'));
        strict_1.default.deepEqual(metadata, {
            title: 'Oembed Site Title',
            excerpt: 'Oembed Site Description',
            featuredImage: null,
            favicon: null,
            oneClickSubscribe: false
        });
    });
    it('does not throw an error even if fetching throws an error', async function () {
        // TODO: simulate DNS resolution failures if possible
        sinon_1.default.stub(got, 'get').rejects(new Error('Failed to fetch'));
        await service.fetch(new URL('https://exampleghostsite.com/subdirectory'));
    });
    it('Nullifies empty oembed data', async function () {
        (0, nock_1.default)('https://exampleghostsite.com')
            .get('/subdirectory/members/api/site')
            .reply(404, 'invalidjson');
        (0, nock_1.default)('https://exampleghostsite.com')
            .get('/members/api/site')
            .reply(404, 'invalidjson');
        fetchOembedDataFromUrl.resolves({
            version: '1.0',
            type: 'webmention',
            metadata: {
                title: '',
                description: '',
                publisher: '',
                author: '',
                thumbnail: '',
                icon: ''
            }
        });
        const metadata = await service.fetch(new URL('https://exampleghostsite.com/subdirectory'));
        strict_1.default.deepEqual(metadata, {
            title: null,
            excerpt: null,
            featuredImage: null,
            favicon: null,
            oneClickSubscribe: false
        });
    });
});
