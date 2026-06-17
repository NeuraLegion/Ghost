"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("assert/strict"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const service_1 = require("../../../../../../core/server/services/recommendations/service");
const dir = path_1.default.join(__dirname, 'data');
async function getContent() {
    const content = await promises_1.default.readFile(path_1.default.join(dir, '.well-known', 'recommendations.json'), 'utf8');
    return JSON.parse(content);
}
describe('WellknownService', function () {
    const service = new service_1.WellknownService({
        urlUtils: {
            relativeToAbsolute(url) {
                return 'https://example.com' + url;
            }
        },
        dir
    });
    afterEach(async function () {
        // Remove folder
        await promises_1.default.rm(dir, { recursive: true, force: true });
    });
    it('Can save recommendations', async function () {
        const recommendations = [
            service_1.Recommendation.create({
                title: 'My Blog',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                url: 'https://example.com/blog',
                oneClickSubscribe: false,
                createdAt: new Date('2021-01-01T00:00:00Z'),
                updatedAt: new Date('2021-02-01T00:00:00Z')
            }),
            service_1.Recommendation.create({
                title: 'My Other Blog',
                description: null,
                excerpt: null,
                featuredImage: null,
                favicon: null,
                url: 'https://example.com/blog2',
                oneClickSubscribe: false,
                createdAt: new Date('2021-01-01T00:00:00Z'),
                updatedAt: null
            })
        ];
        await service.set(recommendations);
        // Check that the file exists
        strict_1.default.deepEqual(await getContent(), [
            {
                url: 'https://example.com/blog',
                created_at: '2021-01-01T00:00:00.000Z',
                updated_at: '2021-02-01T00:00:00.000Z'
            },
            {
                url: 'https://example.com/blog2',
                created_at: '2021-01-01T00:00:00.000Z',
                updated_at: '2021-01-01T00:00:00.000Z'
            }
        ]);
    });
    it('Can get URL', async function () {
        strict_1.default.equal((await service.getURL()).toString(), 'https://example.com/.well-known/recommendations.json');
    });
});
