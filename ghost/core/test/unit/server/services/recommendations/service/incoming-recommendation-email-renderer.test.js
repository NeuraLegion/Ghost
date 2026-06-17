"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("assert/strict"));
const service_1 = require("../../../../../../core/server/services/recommendations/service");
describe('IncomingRecommendationEmailRenderer', function () {
    it('passes all calls', async function () {
        const service = new service_1.IncomingRecommendationEmailRenderer({
            staffService: {
                api: {
                    emails: {
                        renderHTML: async () => 'html',
                        renderText: async () => 'text'
                    }
                }
            }
        });
        strict_1.default.equal(await service.renderSubject({
            title: 'title',
            siteTitle: 'title'
        }), '👍 New recommendation: title');
        strict_1.default.equal(await service.renderHTML({}, {}), 'html');
        strict_1.default.equal(await service.renderText({}, {}), 'text');
    });
});
