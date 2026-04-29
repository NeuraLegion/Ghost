"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("assert/strict"));
const email_address_service_1 = require("../../../../../core/server/services/email-address/email-address-service");
describe('EmailAddressService', function () {
    // Helper to create service config with overrides
    const createConfig = (overrides = {}) => ({
        getManagedEmailEnabled: () => true,
        getSendingDomain: () => 'custom.example.com',
        getFallbackDomain: () => 'fallback.example.com',
        getDefaultEmail: () => ({ address: 'noreply@ghost.org', name: 'Ghost' }),
        getFallbackEmail: () => 'fallback@fallback.example.com',
        isValidEmailAddress: () => true,
        ...overrides
    });
    // Helper to create service instance
    const createService = (configOverrides = {}) => {
        return new email_address_service_1.EmailAddressService(createConfig(configOverrides));
    };
    describe('getAddress with fallback domain', function () {
        it('uses fallback address when useFallbackAddress is true', function () {
            const service = createService();
            const result = service.getAddress({
                from: { address: 'custom@custom.example.com', name: 'Custom Sender' }
            }, { useFallbackAddress: true });
            strict_1.default.equal(result.from.address, 'fallback@fallback.example.com');
            strict_1.default.equal(result.from.name, 'Custom Sender');
            strict_1.default.equal(result.replyTo?.address, 'custom@custom.example.com');
            strict_1.default.equal(result.replyTo?.name, 'Custom Sender');
        });
        it('does not use fallback address when useFallbackAddress is false', function () {
            const service = createService();
            const result = service.getAddress({
                from: { address: 'custom@custom.example.com', name: 'Custom Sender' }
            }, { useFallbackAddress: false });
            strict_1.default.equal(result.from.address, 'custom@custom.example.com');
            strict_1.default.equal(result.from.name, 'Custom Sender');
            strict_1.default.equal(result.replyTo, undefined);
        });
        it('does not use fallback address when fallback email is not configured', function () {
            const service = createService({
                getFallbackEmail: () => null
            });
            const result = service.getAddress({
                from: { address: 'custom@custom.example.com', name: 'Custom Sender' }
            }, { useFallbackAddress: true });
            // Should fall back to normal behavior when fallback not configured
            strict_1.default.equal(result.from.address, 'custom@custom.example.com');
            strict_1.default.equal(result.from.name, 'Custom Sender');
            strict_1.default.equal(result.replyTo, undefined);
        });
        it('preserves existing replyTo when using fallback address', function () {
            const service = createService();
            const result = service.getAddress({
                from: { address: 'custom@custom.example.com', name: 'Custom Sender' },
                replyTo: { address: 'support@custom.example.com', name: 'Support' }
            }, { useFallbackAddress: true });
            strict_1.default.equal(result.from.address, 'fallback@fallback.example.com');
            strict_1.default.equal(result.from.name, 'Custom Sender');
            strict_1.default.equal(result.replyTo?.address, 'support@custom.example.com');
            strict_1.default.equal(result.replyTo?.name, 'Support');
        });
        it('sets fallback from name to default email name when preferred from has no name', function () {
            const service = createService();
            const result = service.getAddress({
                from: { address: 'custom@custom.example.com' }
            }, { useFallbackAddress: true });
            strict_1.default.equal(result.from.address, 'fallback@fallback.example.com');
            strict_1.default.equal(result.from.name, 'Ghost');
            strict_1.default.equal(result.replyTo?.address, 'custom@custom.example.com');
        });
        it('preserves fallback email name when already set', function () {
            const service = createService({
                getFallbackEmail: () => '"Fallback Sender" <fallback@fallback.example.com>'
            });
            const result = service.getAddress({
                from: { address: 'custom@custom.example.com', name: 'Custom Sender' }
            }, { useFallbackAddress: true });
            strict_1.default.equal(result.from.address, 'fallback@fallback.example.com');
            strict_1.default.equal(result.from.name, 'Fallback Sender');
            strict_1.default.equal(result.replyTo?.address, 'custom@custom.example.com');
            strict_1.default.equal(result.replyTo?.name, 'Custom Sender');
        });
    });
    describe('fallbackDomain getter', function () {
        it('returns the fallback domain', function () {
            const service = createService();
            strict_1.default.equal(service.fallbackDomain, 'fallback.example.com');
        });
        it('returns null when not configured', function () {
            const service = createService({
                getFallbackDomain: () => null
            });
            strict_1.default.equal(service.fallbackDomain, null);
        });
    });
    describe('fallbackEmail getter', function () {
        it('returns the parsed fallback email', function () {
            const service = createService({
                getFallbackEmail: () => '"Fallback" <fallback@fallback.example.com>'
            });
            strict_1.default.equal(service.fallbackEmail?.address, 'fallback@fallback.example.com');
            strict_1.default.equal(service.fallbackEmail?.name, 'Fallback');
        });
        it('returns null when not configured', function () {
            const service = createService({
                getFallbackEmail: () => null
            });
            strict_1.default.equal(service.fallbackEmail, null);
        });
    });
});
