"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupEmailVerificationUtils = setupEmailVerificationUtils;
exports.restoreEmailVerificationUtils = restoreEmailVerificationUtils;
const nock_1 = __importDefault(require("nock"));
const configUtils = require('./config-utils');
const models = require('../../core/server/models');
const DEFAULT_WEBHOOK_URL = 'https://test-webhook-receiver.com/mock-verification-event-endpoint/';
const DEFAULT_WEBHOOK_SECRET = 'not-a-live-secret';
const DEFAULT_WEBHOOK_TYPE = 'mock_verification_event';
/**
 * Sets up utilities for testing email verification related functionality, including:
 * - Configuring email verification config settings
 * - Mocking the verification webhook endpoint and recording received requests
 */
async function setupEmailVerificationUtils({ apiThreshold = 0, adminThreshold = 1, importThreshold = 0, verified = false, persist = false, siteId = '1' } = {}) {
    const receivedWebhookRequests = [];
    const webhookUrl = DEFAULT_WEBHOOK_URL;
    const webhookSecret = DEFAULT_WEBHOOK_SECRET;
    const webhookEndpoint = new URL(webhookUrl);
    await models.Settings.edit([{
            key: 'email_verification_required',
            value: false
        }], { context: { internal: true } });
    configUtils.set('hostSettings:siteId', siteId);
    configUtils.set('hostSettings:emailVerification', {
        apiThreshold,
        adminThreshold,
        importThreshold,
        verified,
        webhookType: DEFAULT_WEBHOOK_TYPE,
        webhookUrl,
        webhookSecret
    });
    const scope = (0, nock_1.default)(webhookEndpoint.origin);
    if (persist) {
        scope.persist();
    }
    scope.post(webhookEndpoint.pathname)
        .reply(function (_uri, requestBody) {
        const rawBody = Buffer.isBuffer(requestBody) ?
            requestBody.toString('utf8') :
            typeof requestBody === 'string' ?
                requestBody :
                JSON.stringify(requestBody);
        let parsedBody;
        if (typeof requestBody === 'object' && requestBody !== null && !Buffer.isBuffer(requestBody)) {
            parsedBody = requestBody;
        }
        else {
            try {
                parsedBody = JSON.parse(rawBody);
            }
            catch {
                parsedBody = {};
            }
        }
        receivedWebhookRequests.push({
            body: parsedBody,
            headers: this.req.headers,
            rawBody
        });
        return [200, { status: 'OK' }];
    });
    return {
        webhookSecret,
        webhookUrl,
        receivedWebhookRequests,
        scope
    };
}
async function restoreEmailVerificationUtils() {
    // ensure to reset the flag in settings
    await models.Settings.edit([{
            key: 'email_verification_required',
            value: false
        }], { context: { internal: true } });
    nock_1.default.cleanAll();
    await configUtils.restore();
}
