"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const sinon_1 = __importDefault(require("sinon"));
const gift_bookshelf_repository_1 = require("../../../../../core/server/services/gifts/gift-bookshelf-repository");
const gift_1 = require("../../../../../core/server/services/gifts/gift");
describe('GiftBookshelfRepository', function () {
    afterEach(function () {
        sinon_1.default.restore();
    });
    it('returns a Gift when a token matches', async function () {
        const GiftModel = {
            add: sinon_1.default.stub(),
            transaction: sinon_1.default.stub(),
            findOne: sinon_1.default.stub().resolves({
                save: sinon_1.default.stub(),
                set: sinon_1.default.stub(),
                toJSON() {
                    return {
                        token: 'gift-token',
                        buyer_email: 'buyer@example.com',
                        buyer_member_id: 'buyer_member_1',
                        redeemer_member_id: null,
                        tier_id: 'tier_1',
                        cadence: 'year',
                        duration: 1,
                        currency: 'usd',
                        amount: 5000,
                        stripe_checkout_session_id: 'cs_123',
                        stripe_payment_intent_id: 'pi_456',
                        consumes_at: null,
                        expires_at: new Date('2030-01-01T00:00:00.000Z'),
                        status: 'purchased',
                        purchased_at: new Date('2026-01-01T00:00:00.000Z'),
                        redeemed_at: null,
                        consumed_at: null,
                        expired_at: null,
                        refunded_at: null
                    };
                }
            }),
            findAll: sinon_1.default.stub()
        };
        const repository = new gift_bookshelf_repository_1.GiftBookshelfRepository({ GiftModel });
        const gift = await repository.getByToken('gift-token');
        sinon_1.default.assert.calledOnceWithExactly(GiftModel.findOne, {
            token: 'gift-token'
        }, { require: false });
        strict_1.default.ok(gift instanceof gift_1.Gift);
        strict_1.default.equal(gift?.token, 'gift-token');
        strict_1.default.equal(gift?.tierId, 'tier_1');
    });
    it('forwards transaction locking options when fetching by token', async function () {
        const GiftModel = {
            add: sinon_1.default.stub(),
            transaction: sinon_1.default.stub(),
            findOne: sinon_1.default.stub().resolves(null),
            findAll: sinon_1.default.stub()
        };
        const repository = new gift_bookshelf_repository_1.GiftBookshelfRepository({ GiftModel });
        await repository.getByToken('gift-token', { transacting: 'trx', forUpdate: true });
        sinon_1.default.assert.calledOnceWithExactly(GiftModel.findOne, {
            token: 'gift-token'
        }, { require: false, transacting: 'trx', forUpdate: true });
    });
    it('returns null when no gift matches the token', async function () {
        const GiftModel = {
            add: sinon_1.default.stub(),
            transaction: sinon_1.default.stub(),
            findOne: sinon_1.default.stub().resolves(null),
            findAll: sinon_1.default.stub()
        };
        const repository = new gift_bookshelf_repository_1.GiftBookshelfRepository({ GiftModel });
        const gift = await repository.getByToken('missing-token');
        strict_1.default.equal(gift, null);
    });
    it('updates an existing gift', async function () {
        const existing = {
            save: sinon_1.default.stub().resolves(undefined),
            set: sinon_1.default.stub(),
            toJSON() {
                return {
                    token: 'gift-token',
                    buyer_email: 'buyer@example.com',
                    buyer_member_id: 'buyer_member_1',
                    redeemer_member_id: null,
                    tier_id: 'tier_1',
                    cadence: 'year',
                    duration: 1,
                    currency: 'usd',
                    amount: 5000,
                    stripe_checkout_session_id: 'cs_123',
                    stripe_payment_intent_id: 'pi_456',
                    consumes_at: null,
                    expires_at: new Date('2030-01-01T00:00:00.000Z'),
                    status: 'purchased',
                    purchased_at: new Date('2026-01-01T00:00:00.000Z'),
                    redeemed_at: null,
                    consumed_at: null,
                    expired_at: null,
                    refunded_at: null
                };
            }
        };
        const GiftModel = {
            add: sinon_1.default.stub(),
            transaction: sinon_1.default.stub(),
            findOne: sinon_1.default.stub().resolves(existing),
            findAll: sinon_1.default.stub()
        };
        const repository = new gift_bookshelf_repository_1.GiftBookshelfRepository({ GiftModel });
        const gift = new gift_1.Gift({
            token: 'gift-token',
            buyerEmail: 'buyer@example.com',
            buyerMemberId: 'buyer_member_1',
            redeemerMemberId: 'member_2',
            tierId: 'tier_1',
            cadence: 'year',
            duration: 1,
            currency: 'usd',
            amount: 5000,
            stripeCheckoutSessionId: 'cs_123',
            stripePaymentIntentId: 'pi_456',
            consumesAt: new Date('2031-01-01T00:00:00.000Z'),
            expiresAt: new Date('2030-01-01T00:00:00.000Z'),
            status: 'redeemed',
            purchasedAt: new Date('2026-01-01T00:00:00.000Z'),
            redeemedAt: new Date('2030-01-01T00:00:00.000Z'),
            consumedAt: null,
            expiredAt: null,
            refundedAt: null,
            consumesSoonReminderSentAt: null
        });
        await repository.update(gift, { transacting: 'trx' });
        sinon_1.default.assert.calledOnceWithExactly(GiftModel.findOne, {
            token: 'gift-token'
        }, { require: false, transacting: 'trx' });
        sinon_1.default.assert.calledOnce(existing.save);
        strict_1.default.equal(existing.save.firstCall.args[0].status, 'redeemed');
        strict_1.default.equal(existing.save.firstCall.args[0].redeemer_member_id, 'member_2');
        strict_1.default.equal(existing.save.firstCall.args[1].transacting, 'trx');
        strict_1.default.equal(existing.save.firstCall.args[1].method, 'update');
        strict_1.default.equal(existing.save.firstCall.args[1].patch, true);
    });
    it('throws InternalServerError when updating a gift that does not exist', async function () {
        const GiftModel = {
            add: sinon_1.default.stub(),
            transaction: sinon_1.default.stub(),
            findOne: sinon_1.default.stub().resolves(null),
            findAll: sinon_1.default.stub()
        };
        const repository = new gift_bookshelf_repository_1.GiftBookshelfRepository({ GiftModel });
        const gift = new gift_1.Gift({
            token: 'gift-token',
            buyerEmail: 'buyer@example.com',
            buyerMemberId: 'buyer_member_1',
            redeemerMemberId: null,
            tierId: 'tier_1',
            cadence: 'year',
            duration: 1,
            currency: 'usd',
            amount: 5000,
            stripeCheckoutSessionId: 'cs_123',
            stripePaymentIntentId: 'pi_456',
            consumesAt: null,
            expiresAt: new Date('2030-01-01T00:00:00.000Z'),
            status: 'purchased',
            purchasedAt: new Date('2026-01-01T00:00:00.000Z'),
            redeemedAt: null,
            consumedAt: null,
            expiredAt: null,
            refundedAt: null,
            consumesSoonReminderSentAt: null
        });
        await strict_1.default.rejects(() => repository.update(gift, { transacting: 'trx' }), (err) => {
            strict_1.default.equal(err.errorType, 'InternalServerError');
            strict_1.default.equal(err.message, 'Gift not found: gift-token');
            return true;
        });
    });
    it('delegates transaction callbacks to the model', async function () {
        const GiftModel = {
            add: sinon_1.default.stub(),
            transaction: sinon_1.default.stub().callsFake(async (callback) => {
                return await callback('trx');
            }),
            findOne: sinon_1.default.stub(),
            findAll: sinon_1.default.stub()
        };
        const repository = new gift_bookshelf_repository_1.GiftBookshelfRepository({ GiftModel });
        const result = await repository.transaction(async (transacting) => {
            strict_1.default.equal(transacting, 'trx');
            return 'done';
        });
        sinon_1.default.assert.calledOnce(GiftModel.transaction);
        strict_1.default.equal(result, 'done');
    });
    it('finds gifts pending consumption using current time', async function () {
        const before = new Date();
        const GiftModel = {
            add: sinon_1.default.stub(),
            transaction: sinon_1.default.stub(),
            findOne: sinon_1.default.stub(),
            findAll: sinon_1.default.stub().resolves({
                models: [{
                        toJSON() {
                            return {
                                token: 'gift-token',
                                buyer_email: 'buyer@example.com',
                                buyer_member_id: 'buyer_member_1',
                                redeemer_member_id: 'member_2',
                                tier_id: 'tier_1',
                                cadence: 'year',
                                duration: 1,
                                currency: 'usd',
                                amount: 5000,
                                stripe_checkout_session_id: 'cs_123',
                                stripe_payment_intent_id: 'pi_456',
                                consumes_at: new Date('2026-01-01T00:00:00.000Z'),
                                expires_at: new Date('2030-01-01T00:00:00.000Z'),
                                status: 'redeemed',
                                purchased_at: new Date('2025-01-01T00:00:00.000Z'),
                                redeemed_at: new Date('2025-01-01T12:00:00.000Z'),
                                consumed_at: null,
                                expired_at: null,
                                refunded_at: null
                            };
                        }
                    }]
            })
        };
        const repository = new gift_bookshelf_repository_1.GiftBookshelfRepository({ GiftModel });
        const gifts = await repository.findPendingConsumption();
        const after = new Date();
        strict_1.default.equal(gifts.length, 1);
        strict_1.default.equal(gifts[0].token, 'gift-token');
        strict_1.default.equal(gifts[0].status, 'redeemed');
        sinon_1.default.assert.calledOnce(GiftModel.findAll);
        const filterArg = GiftModel.findAll.getCall(0).args[0].filter;
        strict_1.default.ok(filterArg.startsWith('status:redeemed+consumes_at:<\''));
        const dateStr = filterArg.match(/consumes_at:<'(.+)'/)[1];
        const filterDate = new Date(dateStr);
        strict_1.default.ok(filterDate >= before);
        strict_1.default.ok(filterDate <= after);
    });
    it('finds gifts pending reminders within the configured window that have not yet received a reminder', async function () {
        const GiftModel = {
            add: sinon_1.default.stub(),
            transaction: sinon_1.default.stub(),
            findOne: sinon_1.default.stub(),
            findAll: sinon_1.default.stub().resolves({
                models: [{
                        toJSON() {
                            return {
                                token: 'gift-token',
                                buyer_email: 'buyer@example.com',
                                buyer_member_id: 'buyer_member_1',
                                redeemer_member_id: 'member_2',
                                tier_id: 'tier_1',
                                cadence: 'year',
                                duration: 1,
                                currency: 'usd',
                                amount: 5000,
                                stripe_checkout_session_id: 'cs_123',
                                stripe_payment_intent_id: 'pi_456',
                                consumes_at: new Date('2026-04-20T00:00:00.000Z'),
                                expires_at: new Date('2030-01-01T00:00:00.000Z'),
                                status: 'redeemed',
                                purchased_at: new Date('2025-01-01T00:00:00.000Z'),
                                redeemed_at: new Date('2025-04-20T00:00:00.000Z'),
                                consumed_at: null,
                                expired_at: null,
                                refunded_at: null,
                                consumes_soon_reminder_sent_at: null
                            };
                        }
                    }]
            })
        };
        const repository = new gift_bookshelf_repository_1.GiftBookshelfRepository({ GiftModel });
        const now = new Date('2026-04-16T00:00:00.000Z');
        const reminderLeadMs = 7 * 24 * 60 * 60 * 1000;
        const reminderFloorMs = 3 * 24 * 60 * 60 * 1000;
        const gifts = await repository.findPendingReminder({
            now,
            reminderLeadMs,
            reminderFloorMs,
            transacting: 'trx'
        });
        strict_1.default.equal(gifts.length, 1);
        strict_1.default.equal(gifts[0].token, 'gift-token');
        strict_1.default.equal(gifts[0].consumesSoonReminderSentAt, null);
        sinon_1.default.assert.calledOnce(GiftModel.findAll);
        const callArgs = GiftModel.findAll.getCall(0).args[0];
        const filterArg = callArgs.filter;
        const upperIso = new Date(now.getTime() + reminderLeadMs).toISOString();
        const lowerIso = new Date(now.getTime() + reminderFloorMs).toISOString();
        strict_1.default.equal(callArgs.transacting, 'trx');
        strict_1.default.ok(filterArg.startsWith('status:redeemed'));
        strict_1.default.ok(filterArg.includes(`consumes_at:<='${upperIso}'`));
        strict_1.default.ok(filterArg.includes(`consumes_at:>'${lowerIso}'`));
        strict_1.default.ok(filterArg.includes('consumes_soon_reminder_sent_at:null'));
    });
    it('reads consumes_soon_reminder_sent_at into the domain gift', async function () {
        const reminderSentAt = new Date('2026-04-13T00:00:00.000Z');
        const GiftModel = {
            add: sinon_1.default.stub(),
            transaction: sinon_1.default.stub(),
            findOne: sinon_1.default.stub().resolves({
                save: sinon_1.default.stub(),
                set: sinon_1.default.stub(),
                toJSON() {
                    return {
                        token: 'gift-token',
                        buyer_email: 'buyer@example.com',
                        buyer_member_id: 'buyer_member_1',
                        redeemer_member_id: 'member_2',
                        tier_id: 'tier_1',
                        cadence: 'year',
                        duration: 1,
                        currency: 'usd',
                        amount: 5000,
                        stripe_checkout_session_id: 'cs_123',
                        stripe_payment_intent_id: 'pi_456',
                        consumes_at: new Date('2026-04-20T00:00:00.000Z'),
                        expires_at: new Date('2030-01-01T00:00:00.000Z'),
                        status: 'redeemed',
                        purchased_at: new Date('2025-01-01T00:00:00.000Z'),
                        redeemed_at: new Date('2025-04-20T00:00:00.000Z'),
                        consumed_at: null,
                        expired_at: null,
                        refunded_at: null,
                        consumes_soon_reminder_sent_at: reminderSentAt
                    };
                }
            }),
            findAll: sinon_1.default.stub()
        };
        const repository = new gift_bookshelf_repository_1.GiftBookshelfRepository({ GiftModel });
        const gift = await repository.getByToken('gift-token');
        strict_1.default.ok(gift);
        strict_1.default.equal(gift.consumesSoonReminderSentAt?.toISOString(), reminderSentAt.toISOString());
    });
    it('writes consumes_soon_reminder_sent_at through update', async function () {
        const existing = {
            save: sinon_1.default.stub().resolves(undefined),
            set: sinon_1.default.stub(),
            toJSON() {
                return {
                    token: 'gift-token',
                    buyer_email: 'buyer@example.com',
                    buyer_member_id: 'buyer_member_1',
                    redeemer_member_id: 'member_2',
                    tier_id: 'tier_1',
                    cadence: 'year',
                    duration: 1,
                    currency: 'usd',
                    amount: 5000,
                    stripe_checkout_session_id: 'cs_123',
                    stripe_payment_intent_id: 'pi_456',
                    consumes_at: new Date('2026-04-20T00:00:00.000Z'),
                    expires_at: new Date('2030-01-01T00:00:00.000Z'),
                    status: 'redeemed',
                    purchased_at: new Date('2025-01-01T00:00:00.000Z'),
                    redeemed_at: new Date('2025-04-20T00:00:00.000Z'),
                    consumed_at: null,
                    expired_at: null,
                    refunded_at: null,
                    consumes_soon_reminder_sent_at: null
                };
            }
        };
        const GiftModel = {
            add: sinon_1.default.stub(),
            transaction: sinon_1.default.stub(),
            findOne: sinon_1.default.stub().resolves(existing),
            findAll: sinon_1.default.stub()
        };
        const repository = new gift_bookshelf_repository_1.GiftBookshelfRepository({ GiftModel });
        const reminderSentAt = new Date('2026-04-13T00:00:00.000Z');
        const gift = new gift_1.Gift({
            token: 'gift-token',
            buyerEmail: 'buyer@example.com',
            buyerMemberId: 'buyer_member_1',
            redeemerMemberId: 'member_2',
            tierId: 'tier_1',
            cadence: 'year',
            duration: 1,
            currency: 'usd',
            amount: 5000,
            stripeCheckoutSessionId: 'cs_123',
            stripePaymentIntentId: 'pi_456',
            consumesAt: new Date('2026-04-20T00:00:00.000Z'),
            expiresAt: new Date('2030-01-01T00:00:00.000Z'),
            status: 'redeemed',
            purchasedAt: new Date('2025-01-01T00:00:00.000Z'),
            redeemedAt: new Date('2025-04-20T00:00:00.000Z'),
            consumedAt: null,
            expiredAt: null,
            refundedAt: null,
            consumesSoonReminderSentAt: reminderSentAt
        });
        await repository.update(gift, { transacting: 'trx' });
        sinon_1.default.assert.calledOnce(existing.save);
        const savedRow = existing.save.firstCall.args[0];
        strict_1.default.equal(savedRow.consumes_soon_reminder_sent_at, reminderSentAt);
    });
    it('finds gifts pending expiration using current time', async function () {
        const before = new Date();
        const GiftModel = {
            add: sinon_1.default.stub(),
            transaction: sinon_1.default.stub(),
            findOne: sinon_1.default.stub(),
            findAll: sinon_1.default.stub().resolves({
                models: [{
                        toJSON() {
                            return {
                                token: 'gift-token',
                                buyer_email: 'buyer@example.com',
                                buyer_member_id: 'buyer_member_1',
                                redeemer_member_id: null,
                                tier_id: 'tier_1',
                                cadence: 'year',
                                duration: 1,
                                currency: 'usd',
                                amount: 5000,
                                stripe_checkout_session_id: 'cs_123',
                                stripe_payment_intent_id: 'pi_456',
                                consumes_at: null,
                                expires_at: new Date('2025-01-01T00:00:00.000Z'),
                                status: 'purchased',
                                purchased_at: new Date('2024-01-01T00:00:00.000Z'),
                                redeemed_at: null,
                                consumed_at: null,
                                expired_at: null,
                                refunded_at: null
                            };
                        }
                    }]
            })
        };
        const repository = new gift_bookshelf_repository_1.GiftBookshelfRepository({ GiftModel });
        const gifts = await repository.findPendingExpiration();
        const after = new Date();
        strict_1.default.equal(gifts.length, 1);
        strict_1.default.equal(gifts[0].token, 'gift-token');
        strict_1.default.equal(gifts[0].status, 'purchased');
        sinon_1.default.assert.calledOnce(GiftModel.findAll);
        const filterArg = GiftModel.findAll.getCall(0).args[0].filter;
        strict_1.default.ok(filterArg.startsWith('status:purchased+expires_at:<\''));
        const dateStr = filterArg.match(/expires_at:<'(.+)'/)[1];
        const filterDate = new Date(dateStr);
        strict_1.default.ok(filterDate >= before);
        strict_1.default.ok(filterDate <= after);
    });
    describe('getActiveByMember', function () {
        function stubGiftModel({ model }) {
            // Mimic bookshelf's findOne: only matches when every field in the
            // query equals the corresponding field on the row.
            const findOne = sinon_1.default.stub().callsFake((data) => {
                if (!model) {
                    return Promise.resolve(null);
                }
                const row = model.toJSON();
                const matches = Object.entries(data).every(([key, value]) => row[key] === value);
                return Promise.resolve(matches ? model : null);
            });
            return {
                add: sinon_1.default.stub(),
                transaction: sinon_1.default.stub(),
                findAll: sinon_1.default.stub(),
                findOne
            };
        }
        function buildGiftRow(overrides = {}) {
            return {
                token: 'gift-token',
                buyer_email: 'buyer@example.com',
                buyer_member_id: 'buyer_member_1',
                redeemer_member_id: 'member_2',
                tier_id: 'tier_1',
                cadence: 'year',
                duration: 1,
                currency: 'usd',
                amount: 5000,
                stripe_checkout_session_id: 'cs_123',
                stripe_payment_intent_id: 'pi_456',
                consumes_at: new Date('2027-01-01T00:00:00.000Z'),
                expires_at: new Date('2030-01-01T00:00:00.000Z'),
                status: 'redeemed',
                purchased_at: new Date('2026-01-01T00:00:00.000Z'),
                redeemed_at: new Date('2026-06-01T00:00:00.000Z'),
                consumed_at: null,
                expired_at: null,
                refunded_at: null,
                ...overrides
            };
        }
        it('returns the redeemed gift for a member', async function () {
            const GiftModel = stubGiftModel({
                model: { toJSON: () => buildGiftRow() }
            });
            const repository = new gift_bookshelf_repository_1.GiftBookshelfRepository({ GiftModel });
            const gift = await repository.getActiveByMember('member_2');
            strict_1.default.ok(gift instanceof gift_1.Gift);
            strict_1.default.equal(gift?.token, 'gift-token');
            strict_1.default.equal(gift?.status, 'redeemed');
            sinon_1.default.assert.calledOnce(GiftModel.findOne);
            const [data, options] = GiftModel.findOne.getCall(0).args;
            strict_1.default.deepEqual(data, { redeemer_member_id: 'member_2', status: 'redeemed' });
            strict_1.default.equal(options.require, false);
        });
        it('returns null when no redeemed gift exists for the member', async function () {
            const GiftModel = stubGiftModel({ model: null });
            const repository = new gift_bookshelf_repository_1.GiftBookshelfRepository({ GiftModel });
            const gift = await repository.getActiveByMember('member_without_gift');
            strict_1.default.equal(gift, null);
        });
        it('returns null when redeemed gift is consumed', async function () {
            const GiftModel = stubGiftModel({
                model: {
                    toJSON: () => buildGiftRow({
                        status: 'consumed',
                        consumed_at: new Date('2027-01-01T00:00:00.000Z')
                    })
                }
            });
            const repository = new gift_bookshelf_repository_1.GiftBookshelfRepository({ GiftModel });
            const gift = await repository.getActiveByMember('member_2');
            strict_1.default.equal(gift, null);
        });
        it('returns null when redeemed gift is refunded', async function () {
            const GiftModel = stubGiftModel({
                model: {
                    toJSON: () => buildGiftRow({
                        status: 'refunded',
                        refunded_at: new Date('2026-07-01T00:00:00.000Z')
                    })
                }
            });
            const repository = new gift_bookshelf_repository_1.GiftBookshelfRepository({ GiftModel });
            const gift = await repository.getActiveByMember('member_2');
            strict_1.default.equal(gift, null);
        });
    });
});
