"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("assert/strict"));
const crypto_1 = __importDefault(require("crypto"));
const verification_webhook_service_1 = require("../../../../../core/server/services/verification/verification-webhook-service");
describe('VerificationWebhookService', function () {
    const webhookUrl = 'https://test-webhook-receiver.com/mock-verification-event-endpoint/';
    const webhookSecret = 'not-a-live-secret';
    const webhookType = 'mock_verification_event';
    const createService = (overrides = {}) => {
        const request = async () => null;
        const dependencies = {
            config: {
                get: (key) => {
                    const values = {
                        'hostSettings:emailVerification:webhookType': webhookType,
                        'hostSettings:emailVerification:webhookUrl': webhookUrl,
                        'hostSettings:emailVerification:webhookSecret': webhookSecret,
                        'hostSettings:siteId': '1'
                    };
                    return values[key];
                }
            },
            logging: {
                info: () => { },
                warn: () => { },
                error: () => { }
            },
            request,
            ...overrides
        };
        return new verification_webhook_service_1.VerificationWebhookService(dependencies);
    };
    it('returns false when webhookType is missing', async function () {
        let warnMessage;
        const service = createService({
            config: {
                get: (key) => {
                    if (key === 'hostSettings:emailVerification:webhookType') {
                        return '';
                    }
                    if (key === 'hostSettings:emailVerification:webhookUrl') {
                        return webhookUrl;
                    }
                    return null;
                }
            },
            logging: {
                info: () => { },
                warn: (message) => {
                    warnMessage = message;
                },
                error: () => { }
            }
        });
        const result = await service.sendVerificationWebhook({
            amountTriggered: 1001,
            threshold: 1000,
            method: 'import'
        });
        strict_1.default.equal(result, false);
        strict_1.default.equal(warnMessage, 'Verification webhook is not configured because webhookType is missing.');
    });
    it('sends a POST request with the signed webhook payload', async function () {
        let requestUrl;
        let requestOptions;
        let infoMessage;
        const service = createService({
            logging: {
                info: (message) => {
                    infoMessage = message;
                },
                warn: () => { },
                error: () => { }
            },
            request: async (url, options) => {
                requestUrl = url;
                requestOptions = options;
                return null;
            }
        });
        const result = await service.sendVerificationWebhook({
            amountTriggered: 1001,
            threshold: 1000,
            method: 'import'
        });
        strict_1.default.equal(result, true);
        strict_1.default.equal(requestUrl, webhookUrl);
        strict_1.default.equal(requestOptions.method, 'POST');
        strict_1.default.equal(infoMessage, 'Triggering verification webhook to "https://test-webhook-receiver.com"');
        const parsedBody = JSON.parse(requestOptions.body);
        strict_1.default.deepEqual(parsedBody, {
            type: webhookType,
            siteId: '1',
            threshold: 1000,
            amountTriggered: 1001,
            method: 'import'
        });
        const timestamp = requestOptions.headers['X-Ghost-Request-Timestamp'];
        const expectedSignature = crypto_1.default
            .createHmac('sha256', webhookSecret)
            .update(`${timestamp}:${requestOptions.body}`)
            .digest('base64');
        strict_1.default.equal(requestOptions.headers['X-Ghost-Signature'], expectedSignature);
    });
    it('logs a sanitized webhook URL when delivery fails', async function () {
        let errorMessage;
        const service = createService({
            logging: {
                info: () => { },
                warn: () => { },
                error: (message) => {
                    errorMessage = message;
                }
            },
            request: async () => {
                throw new Error('Webhook failed');
            }
        });
        await strict_1.default.rejects(service.sendVerificationWebhook({
            amountTriggered: 1001,
            threshold: 1000,
            method: 'import'
        }), /Webhook failed/);
        strict_1.default.equal(errorMessage, 'Failed to send verification webhook to "https://test-webhook-receiver.com": Webhook failed');
    });
});
