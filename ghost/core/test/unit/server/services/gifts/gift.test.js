"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const gift_1 = require("../../../../../core/server/services/gifts/gift");
const constants_1 = require("../../../../../core/server/services/gifts/constants");
const utils_1 = require("./utils");
describe('Gift', function () {
    const purchaseData = {
        token: 'abc-123',
        buyerEmail: 'buyer@example.com',
        buyerMemberId: 'member_1',
        tierId: 'tier_1',
        cadence: 'year',
        duration: 1,
        currency: 'usd',
        amount: 5000,
        stripeCheckoutSessionId: 'cs_123',
        stripePaymentIntentId: 'pi_456'
    };
    describe('fromPurchase', function () {
        it('sets status to purchased', function () {
            const gift = gift_1.Gift.fromPurchase(purchaseData);
            strict_1.default.equal(gift.status, 'purchased');
        });
        it('sets purchasedAt to now', function () {
            const before = new Date();
            const gift = gift_1.Gift.fromPurchase(purchaseData);
            const after = new Date();
            strict_1.default.ok(gift.purchasedAt >= before);
            strict_1.default.ok(gift.purchasedAt <= after);
        });
        it('sets expiresAt to GIFT_EXPIRY_DAYS after purchasedAt', function () {
            const gift = gift_1.Gift.fromPurchase(purchaseData);
            const daysDiff = Math.round((gift.expiresAt.getTime() - gift.purchasedAt.getTime()) / (1000 * 60 * 60 * 24));
            strict_1.default.equal(daysDiff, constants_1.GIFT_EXPIRY_DAYS);
        });
        it('sets null defaults for redemption fields', function () {
            const gift = gift_1.Gift.fromPurchase(purchaseData);
            strict_1.default.equal(gift.redeemerMemberId, null);
            strict_1.default.equal(gift.consumesAt, null);
            strict_1.default.equal(gift.redeemedAt, null);
            strict_1.default.equal(gift.consumedAt, null);
            strict_1.default.equal(gift.expiredAt, null);
            strict_1.default.equal(gift.refundedAt, null);
            strict_1.default.equal(gift.consumesSoonReminderSentAt, null);
        });
        it('passes through purchase data', function () {
            const gift = gift_1.Gift.fromPurchase(purchaseData);
            strict_1.default.equal(gift.token, 'abc-123');
            strict_1.default.equal(gift.buyerEmail, 'buyer@example.com');
            strict_1.default.equal(gift.buyerMemberId, 'member_1');
            strict_1.default.equal(gift.tierId, 'tier_1');
            strict_1.default.equal(gift.cadence, 'year');
            strict_1.default.equal(gift.duration, 1);
            strict_1.default.equal(gift.currency, 'usd');
            strict_1.default.equal(gift.amount, 5000);
            strict_1.default.equal(gift.stripeCheckoutSessionId, 'cs_123');
            strict_1.default.equal(gift.stripePaymentIntentId, 'pi_456');
        });
    });
    describe('checkRedeemable', function () {
        const testCases = [
            {
                name: 'redeemed',
                overrides: {
                    redeemedAt: new Date('2026-02-01T00:00:00.000Z')
                },
                memberStatus: null,
                reason: 'redeemed'
            },
            {
                name: 'consumed',
                overrides: {
                    consumedAt: new Date('2026-02-01T00:00:00.000Z')
                },
                memberStatus: null,
                reason: 'consumed'
            },
            {
                name: 'expired',
                overrides: {
                    expiredAt: new Date('2026-02-01T00:00:00.000Z')
                },
                memberStatus: null,
                reason: 'expired'
            },
            {
                name: 'refunded',
                overrides: {
                    refundedAt: new Date('2026-02-01T00:00:00.000Z')
                },
                memberStatus: null,
                reason: 'refunded'
            },
            {
                name: 'paid-member for a paid member',
                overrides: {},
                memberStatus: 'paid',
                reason: 'paid-member'
            },
            {
                name: 'paid-member for a comped member',
                overrides: {},
                memberStatus: 'comped',
                reason: 'paid-member'
            }
        ];
        it('returns the gift when it has not been redeemed, consumed, expired, or refunded', function () {
            const gift = (0, utils_1.buildGift)();
            const result = gift.checkRedeemable(null);
            strict_1.default.deepEqual(result, { redeemable: true });
        });
        it('returns the gift for a free member', function () {
            const gift = (0, utils_1.buildGift)();
            const result = gift.checkRedeemable('free');
            strict_1.default.deepEqual(result, { redeemable: true });
        });
        for (const { name, overrides, memberStatus, reason } of testCases) {
            it(`returns ${reason} error when state is ${name}`, function () {
                const gift = (0, utils_1.buildGift)(overrides);
                const result = gift.checkRedeemable(memberStatus);
                strict_1.default.deepEqual(result, { redeemable: false, reason });
            });
        }
    });
    describe('consume', function () {
        it('returns a consumed gift without mutating the original gift', function () {
            const gift = (0, utils_1.buildGift)({
                status: 'redeemed',
                redeemerMemberId: 'member_2',
                redeemedAt: new Date('2026-04-11T12:00:00.000Z'),
                consumesAt: new Date('2027-04-11T12:00:00.000Z')
            });
            const before = new Date();
            const consumed = gift.consume();
            const after = new Date();
            strict_1.default.notEqual(consumed, gift);
            strict_1.default.equal(gift.status, 'redeemed');
            strict_1.default.equal(gift.consumedAt, null);
            strict_1.default.equal(consumed.status, 'consumed');
            strict_1.default.ok(consumed.consumedAt >= before);
            strict_1.default.ok(consumed.consumedAt <= after);
        });
        it('preserves all other fields', function () {
            const gift = (0, utils_1.buildGift)({
                status: 'redeemed',
                redeemerMemberId: 'member_2',
                redeemedAt: new Date('2026-04-11T12:00:00.000Z'),
                consumesAt: new Date('2027-04-11T12:00:00.000Z')
            });
            const consumed = gift.consume();
            strict_1.default.ok(consumed);
            strict_1.default.equal(consumed.token, gift.token);
            strict_1.default.equal(consumed.redeemerMemberId, gift.redeemerMemberId);
            strict_1.default.equal(consumed.tierId, gift.tierId);
            strict_1.default.equal(consumed.consumesAt?.toISOString(), gift.consumesAt?.toISOString());
        });
        it('returns null when the gift is already consumed', function () {
            const gift = (0, utils_1.buildGift)({
                status: 'consumed',
                consumedAt: new Date('2026-04-12T00:00:00.000Z')
            });
            strict_1.default.equal(gift.consume(), null);
        });
    });
    describe('redeem', function () {
        it('returns a redeemed gift for the member without mutating the original gift', function () {
            const gift = (0, utils_1.buildGift)();
            const redeemedAt = new Date('2026-04-11T12:00:00.000Z');
            const redeemed = gift.redeem({
                memberId: 'member_2',
                redeemedAt
            });
            strict_1.default.notEqual(redeemed, gift);
            strict_1.default.equal(gift.redeemerMemberId, null);
            strict_1.default.equal(gift.redeemedAt, null);
            strict_1.default.equal(gift.status, 'purchased');
            strict_1.default.equal(redeemed.redeemerMemberId, 'member_2');
            strict_1.default.equal(redeemed.redeemedAt, redeemedAt);
            strict_1.default.equal(redeemed.status, 'redeemed');
            strict_1.default.equal(redeemed.consumesAt?.toISOString(), '2027-04-11T12:00:00.000Z');
        });
        it('calculates monthly consumption dates from the redemption time', function () {
            const gift = (0, utils_1.buildGift)({
                cadence: 'month',
                duration: 3
            });
            const redeemed = gift.redeem({
                memberId: 'member_2',
                redeemedAt: new Date('2026-04-11T12:00:00.000Z')
            });
            strict_1.default.equal(redeemed.consumesAt?.toISOString(), '2026-07-11T12:00:00.000Z');
        });
        it('keeps month-end redemption math stable for shorter months', function () {
            const gift = (0, utils_1.buildGift)({
                cadence: 'month',
                duration: 1
            });
            const redeemed = gift.redeem({
                memberId: 'member_2',
                redeemedAt: new Date('2026-01-31T12:00:00.000Z')
            });
            strict_1.default.equal(redeemed.consumesAt?.toISOString(), '2026-03-03T12:00:00.000Z');
        });
        it('keeps yearly redemption math stable across leap years', function () {
            const gift = (0, utils_1.buildGift)({
                cadence: 'year',
                duration: 1
            });
            const redeemed = gift.redeem({
                memberId: 'member_2',
                redeemedAt: new Date('2024-02-29T12:00:00.000Z')
            });
            strict_1.default.equal(redeemed.consumesAt?.toISOString(), '2025-03-01T12:00:00.000Z');
        });
    });
    describe('expire', function () {
        it('returns an expired gift without mutating the original', function () {
            const gift = (0, utils_1.buildGift)();
            const before = new Date();
            const expired = gift.expire();
            const after = new Date();
            strict_1.default.ok(expired);
            strict_1.default.notEqual(expired, gift);
            strict_1.default.equal(gift.status, 'purchased');
            strict_1.default.equal(gift.expiredAt, null);
            strict_1.default.equal(expired.status, 'expired');
            strict_1.default.ok(expired.expiredAt);
            strict_1.default.ok(expired.expiredAt >= before);
            strict_1.default.ok(expired.expiredAt <= after);
        });
        it('returns null if already expired', function () {
            const gift = (0, utils_1.buildGift)({
                status: 'expired',
                expiredAt: new Date('2026-02-01T00:00:00.000Z')
            });
            const result = gift.expire();
            strict_1.default.equal(result, null);
        });
    });
    describe('refund', function () {
        it('returns a refunded gift without mutating the original', function () {
            const gift = (0, utils_1.buildGift)();
            const before = new Date();
            const refunded = gift.refund();
            const after = new Date();
            strict_1.default.ok(refunded);
            strict_1.default.notEqual(refunded, gift);
            strict_1.default.equal(gift.status, 'purchased');
            strict_1.default.equal(gift.refundedAt, null);
            strict_1.default.equal(refunded.status, 'refunded');
            strict_1.default.ok(refunded.refundedAt);
            strict_1.default.ok(refunded.refundedAt >= before);
            strict_1.default.ok(refunded.refundedAt <= after);
        });
        it('returns null if already refunded', function () {
            const gift = (0, utils_1.buildGift)({
                status: 'refunded',
                refundedAt: new Date('2026-02-01T00:00:00.000Z')
            });
            const result = gift.refund();
            strict_1.default.equal(result, null);
        });
    });
    describe('remind', function () {
        it('returns a gift with consumesSoonReminderSentAt set without mutating the original', function () {
            const gift = (0, utils_1.buildGift)({
                status: 'redeemed',
                redeemerMemberId: 'member_2',
                redeemedAt: new Date('2026-04-11T12:00:00.000Z'),
                consumesAt: new Date('2027-04-11T12:00:00.000Z')
            });
            const before = new Date();
            const reminded = gift.remind();
            const after = new Date();
            strict_1.default.ok(reminded);
            strict_1.default.notEqual(reminded, gift);
            strict_1.default.equal(gift.consumesSoonReminderSentAt, null);
            strict_1.default.ok(reminded.consumesSoonReminderSentAt);
            strict_1.default.ok(reminded.consumesSoonReminderSentAt >= before);
            strict_1.default.ok(reminded.consumesSoonReminderSentAt <= after);
        });
        it('returns null if already reminded', function () {
            const gift = (0, utils_1.buildGift)({
                status: 'redeemed',
                redeemerMemberId: 'member_2',
                redeemedAt: new Date('2026-04-11T12:00:00.000Z'),
                consumesAt: new Date('2027-04-11T12:00:00.000Z'),
                consumesSoonReminderSentAt: new Date('2027-04-01T12:00:00.000Z')
            });
            const result = gift.remind();
            strict_1.default.equal(result, null);
        });
    });
});
