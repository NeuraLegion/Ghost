"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const errors_1 = __importDefault(require("@tryghost/errors"));
const sinon_1 = __importDefault(require("sinon"));
const gift_service_1 = require("../../../../../core/server/services/gifts/gift-service");
const gift_1 = require("../../../../../core/server/services/gifts/gift");
const utils_1 = require("./utils");
function buildRedeemedGift(overrides = {}) {
    return (0, utils_1.buildGift)({
        token: 'gift-token',
        status: 'redeemed',
        redeemerMemberId: 'member_1',
        redeemedAt: new Date('2025-04-01T00:00:00.000Z'),
        consumesAt: new Date('2026-04-16T00:00:00.000Z'),
        ...overrides
    });
}
function buildRedeemer(id = 'member_1') {
    const memberGet = sinon_1.default.stub();
    memberGet.withArgs('email').returns(`${id}@example.com`);
    memberGet.withArgs('name').returns('Member Name');
    memberGet.withArgs('email_disabled').returns(false);
    return { id, get: memberGet };
}
describe('GiftService', function () {
    let giftRepository;
    let memberRepository;
    let staffServiceEmails;
    let giftEmailService;
    let tiersService;
    const purchaseData = {
        token: 'abc-123',
        buyerEmail: 'buyer@example.com',
        stripeCustomerId: 'cust_123',
        tierId: 'tier_1',
        cadence: 'year',
        duration: '1',
        currency: 'usd',
        amount: 5000,
        stripeCheckoutSessionId: 'cs_123',
        stripePaymentIntentId: 'pi_456'
    };
    beforeEach(function () {
        giftRepository = {
            existsByCheckoutSessionId: sinon_1.default.stub().resolves(false),
            getByToken: sinon_1.default.stub().resolves(null),
            getByPaymentIntentId: sinon_1.default.stub().resolves(null),
            getActiveByMember: sinon_1.default.stub().resolves(null),
            findPendingConsumption: sinon_1.default.stub().resolves([]),
            findPendingExpiration: sinon_1.default.stub().resolves([]),
            findPendingReminder: sinon_1.default.stub().resolves([]),
            create: sinon_1.default.stub(),
            update: sinon_1.default.stub(),
            transaction: sinon_1.default.stub().callsFake(async (callback) => {
                return await callback('trx');
            })
        };
        memberRepository = {
            get: sinon_1.default.stub().resolves({ id: 'member_1', get: sinon_1.default.stub().returns(null) }),
            update: sinon_1.default.stub().resolves(undefined)
        };
        staffServiceEmails = {
            notifyGiftReceived: sinon_1.default.stub(),
            notifyGiftSubscriptionStarted: sinon_1.default.stub()
        };
        giftEmailService = {
            sendPurchaseConfirmation: sinon_1.default.stub().resolves(undefined),
            sendReminder: sinon_1.default.stub().resolves(undefined)
        };
        tiersService = {
            api: {
                read: sinon_1.default.stub().resolves({
                    id: 'tier_1',
                    name: 'Bronze',
                    description: 'Tier description',
                    benefits: ['Benefit 1', 'Benefit 2'],
                    currency: 'usd',
                    monthlyPrice: 1000,
                    yearlyPrice: 10000
                })
            }
        };
    });
    afterEach(function () {
        sinon_1.default.restore();
    });
    function createService(overrides = {}) {
        return new gift_service_1.GiftService({
            giftRepository: giftRepository,
            memberRepository,
            tiersService,
            giftEmailService,
            staffServiceEmails,
            schedulerAdapter: overrides.schedulerAdapter ?? null,
            schedulerIntegration: overrides.schedulerIntegration ?? null,
            getSignedAdminToken: overrides.getSignedAdminToken ?? null,
            urlJoin: overrides.urlJoin ?? null,
            apiUrl: overrides.apiUrl ?? null
        });
    }
    describe('generateToken', function () {
        it('returns a 12-character base62 string', function () {
            const service = createService();
            for (let i = 0; i < 50; i++) {
                strict_1.default.match(service.generateToken(), /^[A-Za-z0-9]{12}$/);
            }
        });
        it('produces unique tokens across many invocations', function () {
            const service = createService();
            const tokens = new Set();
            const samples = 10_000;
            for (let i = 0; i < samples; i++) {
                tokens.add(service.generateToken());
            }
            strict_1.default.equal(tokens.size, samples);
        });
    });
    describe('recordPurchase', function () {
        it('creates a Gift entity and saves it', async function () {
            const service = createService();
            const result = await service.recordPurchase(purchaseData);
            strict_1.default.equal(result, true);
            sinon_1.default.assert.calledOnce(giftRepository.create);
            const gift = giftRepository.create.getCall(0).args[0];
            strict_1.default.ok(gift instanceof gift_1.Gift);
            strict_1.default.equal(gift.token, 'abc-123');
            strict_1.default.equal(gift.status, 'purchased');
        });
        it('returns false and skips create for duplicate checkout session', async function () {
            giftRepository.existsByCheckoutSessionId.resolves(true);
            const service = createService();
            const result = await service.recordPurchase(purchaseData);
            strict_1.default.equal(result, false);
            sinon_1.default.assert.notCalled(giftRepository.create);
        });
        it('resolves member by stripeCustomerId', async function () {
            const memberGet = sinon_1.default.stub();
            memberGet.withArgs('name').returns('Member Name');
            memberGet.withArgs('email').returns('member@example.com');
            memberRepository.get.resolves({ id: 'member_1', get: memberGet });
            const service = createService();
            await service.recordPurchase(purchaseData);
            sinon_1.default.assert.calledWith(memberRepository.get, { customer_id: 'cust_123' });
            const gift = giftRepository.create.getCall(0).args[0];
            strict_1.default.equal(gift.buyerMemberId, 'member_1');
        });
        it('sets buyerMemberId to null when stripeCustomerId is null', async function () {
            const service = createService();
            await service.recordPurchase({ ...purchaseData, stripeCustomerId: null });
            sinon_1.default.assert.notCalled(memberRepository.get);
            const gift = giftRepository.create.getCall(0).args[0];
            strict_1.default.equal(gift.buyerMemberId, null);
        });
        it('sets buyerMemberId to null when member not found', async function () {
            memberRepository.get.resolves(null);
            const service = createService();
            await service.recordPurchase(purchaseData);
            const gift = giftRepository.create.getCall(0).args[0];
            strict_1.default.equal(gift.buyerMemberId, null);
        });
        it('parses duration from string to number', async function () {
            const service = createService();
            await service.recordPurchase({ ...purchaseData, duration: '3' });
            const gift = giftRepository.create.getCall(0).args[0];
            strict_1.default.equal(gift.duration, 3);
        });
        it('throws ValidationError for invalid duration', async function () {
            const service = createService();
            await strict_1.default.rejects(() => service.recordPurchase({ ...purchaseData, duration: 'invalid' }), (err) => {
                strict_1.default.equal(err.errorType, 'ValidationError');
                strict_1.default.ok(err.message.includes('invalid'));
                return true;
            });
            sinon_1.default.assert.notCalled(giftRepository.create);
        });
        it('sends staff notification email after recording purchase', async function () {
            const memberGet = sinon_1.default.stub();
            memberGet.withArgs('name').returns('Member Name');
            memberGet.withArgs('email').returns('member@example.com');
            memberRepository.get.resolves({ id: 'member_1', get: memberGet });
            const service = createService();
            await service.recordPurchase(purchaseData);
            sinon_1.default.assert.calledOnce(staffServiceEmails.notifyGiftReceived);
            const emailData = staffServiceEmails.notifyGiftReceived.getCall(0).args[0];
            strict_1.default.equal(emailData.name, 'Member Name');
            strict_1.default.equal(emailData.email, 'member@example.com');
            strict_1.default.equal(emailData.memberId, 'member_1');
            strict_1.default.equal(emailData.amount, 5000);
            strict_1.default.equal(emailData.currency, 'usd');
            strict_1.default.equal(emailData.tierName, 'Bronze');
            strict_1.default.equal(emailData.cadence, 'year');
            strict_1.default.equal(emailData.duration, 1);
        });
        it('throws when tier is not found', async function () {
            tiersService.api.read.resolves(null);
            const service = createService();
            await strict_1.default.rejects(() => service.recordPurchase(purchaseData), { message: 'Tier not found: tier_1' });
            sinon_1.default.assert.notCalled(staffServiceEmails.notifyGiftReceived);
            sinon_1.default.assert.notCalled(giftEmailService.sendPurchaseConfirmation);
        });
        it('uses buyerEmail and null name when buyer is not a member', async function () {
            const service = createService();
            await service.recordPurchase({ ...purchaseData, stripeCustomerId: null });
            sinon_1.default.assert.calledOnce(staffServiceEmails.notifyGiftReceived);
            const emailData = staffServiceEmails.notifyGiftReceived.getCall(0).args[0];
            strict_1.default.equal(emailData.name, null);
            strict_1.default.equal(emailData.email, 'buyer@example.com');
            strict_1.default.equal(emailData.memberId, null);
        });
        it('sends buyer confirmation email', async function () {
            const service = createService();
            await service.recordPurchase(purchaseData);
            sinon_1.default.assert.calledOnce(tiersService.api.read);
            sinon_1.default.assert.calledWith(tiersService.api.read, 'tier_1');
            sinon_1.default.assert.calledOnce(giftEmailService.sendPurchaseConfirmation);
            const emailData = giftEmailService.sendPurchaseConfirmation.getCall(0).args[0];
            strict_1.default.equal(emailData.buyerEmail, 'buyer@example.com');
            strict_1.default.equal(emailData.amount, 5000);
            strict_1.default.equal(emailData.currency, 'usd');
            strict_1.default.equal(emailData.token, 'abc-123');
            strict_1.default.equal(emailData.tierName, 'Bronze');
            strict_1.default.equal(emailData.cadence, 'year');
            strict_1.default.equal(emailData.duration, 1);
            strict_1.default.ok(emailData.expiresAt instanceof Date);
        });
        it('does not fail purchase when buyer confirmation email throws', async function () {
            giftEmailService.sendPurchaseConfirmation.rejects(new Error('SMTP error'));
            const service = createService();
            const result = await service.recordPurchase(purchaseData);
            strict_1.default.equal(result, true);
            sinon_1.default.assert.calledOnce(giftRepository.create);
        });
    });
    describe('getByToken', function () {
        it('returns the gift when the token exists', async function () {
            const expectedGift = (0, utils_1.buildGift)();
            giftRepository.getByToken.resolves(expectedGift);
            const service = createService();
            const result = await service.getByToken('gift-token');
            sinon_1.default.assert.calledOnceWithExactly(giftRepository.getByToken, 'gift-token');
            strict_1.default.equal(result, expectedGift);
        });
        it('returns null when the token does not exist', async function () {
            giftRepository.getByToken.resolves(null);
            const service = createService();
            const result = await service.getByToken('missing-token');
            sinon_1.default.assert.calledOnceWithExactly(giftRepository.getByToken, 'missing-token');
            strict_1.default.equal(result, null);
        });
    });
    describe('getRedeemable', function () {
        it('returns the gift when it exists and is redeemable', async function () {
            const gift = (0, utils_1.buildGift)();
            const service = createService();
            const assertRedeemableStub = sinon_1.default.stub(service, 'assertRedeemable').resolves(gift);
            giftRepository.getByToken.resolves(gift);
            const result = await service.getRedeemable('gift-token', 'free');
            sinon_1.default.assert.calledOnceWithExactly(giftRepository.getByToken, 'gift-token');
            sinon_1.default.assert.calledOnceWithExactly(assertRedeemableStub, gift, 'free');
            strict_1.default.equal(result, gift);
        });
        it('throws NotFoundError when the token does not exist', async function () {
            giftRepository.getByToken.resolves(null);
            const service = createService();
            await strict_1.default.rejects(() => service.getRedeemable('missing-token', 'free'), (err) => {
                strict_1.default.equal(err.errorType, 'NotFoundError');
                strict_1.default.equal(err.message, 'This gift does not exist.');
                return true;
            });
        });
        it('passes through redeemability errors unchanged', async function () {
            const gift = (0, utils_1.buildGift)();
            const serviceError = new errors_1.default.BadRequestError({ message: 'This gift has expired.' });
            const service = createService();
            const assertRedeemableStub = sinon_1.default.stub(service, 'assertRedeemable').rejects(serviceError);
            giftRepository.getByToken.resolves(gift);
            await strict_1.default.rejects(() => service.getRedeemable('gift-token', 'free'), serviceError);
            sinon_1.default.assert.calledOnceWithExactly(assertRedeemableStub, gift, 'free');
        });
    });
    describe('assertRedeemable', function () {
        const testCases = [
            {
                name: 'redeemed gifts',
                overrides: {
                    redeemedAt: new Date('2026-02-01T00:00:00.000Z')
                },
                memberStatus: null,
                message: 'This gift has already been redeemed.'
            },
            {
                name: 'consumed gifts',
                overrides: {
                    consumedAt: new Date('2026-02-01T00:00:00.000Z')
                },
                memberStatus: null,
                message: 'This gift has already been consumed.'
            },
            {
                name: 'expired gifts',
                overrides: {
                    expiredAt: new Date('2026-02-01T00:00:00.000Z')
                },
                memberStatus: null,
                message: 'This gift has expired.'
            },
            {
                name: 'refunded gifts',
                overrides: {
                    refundedAt: new Date('2026-02-01T00:00:00.000Z')
                },
                memberStatus: null,
                message: 'This gift has been refunded.'
            },
            {
                name: 'paid members',
                overrides: {},
                memberStatus: 'paid',
                message: 'You already have an active subscription.'
            }
        ];
        it('returns the gift when it is redeemable', async function () {
            const gift = (0, utils_1.buildGift)();
            const checkRedeemableSpy = sinon_1.default.spy(gift, 'checkRedeemable');
            const service = createService();
            const result = await service.assertRedeemable(gift, 'free');
            sinon_1.default.assert.calledOnceWithExactly(checkRedeemableSpy, 'free');
            strict_1.default.equal(result, gift);
        });
        for (const { name, overrides, memberStatus, message } of testCases) {
            it(`throws BadRequestError for ${name}`, async function () {
                const gift = (0, utils_1.buildGift)(overrides);
                const service = createService();
                await strict_1.default.rejects(() => service.assertRedeemable(gift, memberStatus), (err) => {
                    strict_1.default.equal(err.errorType, 'BadRequestError');
                    strict_1.default.equal(err.message, message);
                    return true;
                });
            });
        }
    });
    describe('processConsumed', function () {
        it('returns zero counts when no gifts are pending consumption', async function () {
            giftRepository.findPendingConsumption.resolves([]);
            const service = createService();
            const result = await service.processConsumed();
            strict_1.default.deepEqual(result, { consumedCount: 0, updatedMemberCount: 0 });
            sinon_1.default.assert.notCalled(memberRepository.get);
            sinon_1.default.assert.notCalled(memberRepository.update);
            sinon_1.default.assert.notCalled(giftRepository.update);
        });
        it('downgrades gift members and marks gifts as consumed', async function () {
            const gift = (0, utils_1.buildGift)({
                status: 'redeemed',
                redeemerMemberId: 'member_1',
                redeemedAt: new Date('2025-04-01T00:00:00.000Z'),
                consumesAt: new Date('2026-04-01T00:00:00.000Z')
            });
            giftRepository.findPendingConsumption.resolves([gift]);
            giftRepository.getByToken.resolves(gift);
            memberRepository.get.resolves({
                id: 'member_1',
                get: sinon_1.default.stub().withArgs('status').returns('gift')
            });
            const service = createService();
            const result = await service.processConsumed();
            strict_1.default.equal(result.consumedCount, 1);
            strict_1.default.equal(result.updatedMemberCount, 1);
            sinon_1.default.assert.calledOnce(giftRepository.transaction);
            sinon_1.default.assert.calledOnceWithExactly(giftRepository.getByToken, gift.token, { transacting: 'trx', forUpdate: true });
            sinon_1.default.assert.calledOnceWithExactly(memberRepository.update, {
                products: [],
                status: 'free'
            }, { id: 'member_1', transacting: 'trx' });
            sinon_1.default.assert.calledOnce(giftRepository.update);
            const savedGift = giftRepository.update.getCall(0).args[0];
            strict_1.default.equal(savedGift.status, 'consumed');
            strict_1.default.notEqual(savedGift.consumedAt, null);
        });
        it('skips gifts that are no longer redeemed when re-loaded', async function () {
            const gift = (0, utils_1.buildGift)({
                status: 'redeemed',
                redeemerMemberId: 'member_1',
                redeemedAt: new Date('2025-04-01T00:00:00.000Z'),
                consumesAt: new Date('2026-04-01T00:00:00.000Z')
            });
            giftRepository.findPendingConsumption.resolves([gift]);
            giftRepository.getByToken.resolves((0, utils_1.buildGift)({
                status: 'refunded',
                refundedAt: new Date()
            }));
            const service = createService();
            const result = await service.processConsumed();
            strict_1.default.equal(result.consumedCount, 0);
            strict_1.default.equal(result.updatedMemberCount, 0);
            sinon_1.default.assert.notCalled(giftRepository.update);
            sinon_1.default.assert.notCalled(memberRepository.get);
        });
        it('skips members that are no longer in gift status', async function () {
            const gift = (0, utils_1.buildGift)({
                status: 'redeemed',
                redeemerMemberId: 'member_1',
                redeemedAt: new Date('2025-04-01T00:00:00.000Z'),
                consumesAt: new Date('2026-04-01T00:00:00.000Z')
            });
            giftRepository.findPendingConsumption.resolves([gift]);
            giftRepository.getByToken.resolves(gift);
            memberRepository.get.resolves({
                id: 'member_1',
                get: sinon_1.default.stub().withArgs('status').returns('paid')
            });
            const service = createService();
            const result = await service.processConsumed();
            strict_1.default.equal(result.consumedCount, 1);
            strict_1.default.equal(result.updatedMemberCount, 0);
            sinon_1.default.assert.notCalled(memberRepository.update);
            // Gift should still be marked consumed
            sinon_1.default.assert.calledOnce(giftRepository.update);
        });
        it('skips members that no longer exist', async function () {
            const gift = (0, utils_1.buildGift)({
                status: 'redeemed',
                redeemerMemberId: 'member_1',
                redeemedAt: new Date('2025-04-01T00:00:00.000Z'),
                consumesAt: new Date('2026-04-01T00:00:00.000Z')
            });
            giftRepository.findPendingConsumption.resolves([gift]);
            giftRepository.getByToken.resolves(gift);
            memberRepository.get.resolves(null);
            const service = createService();
            const result = await service.processConsumed();
            strict_1.default.equal(result.consumedCount, 1);
            strict_1.default.equal(result.updatedMemberCount, 0);
            sinon_1.default.assert.notCalled(memberRepository.update);
        });
        it('handles multiple gifts for different members', async function () {
            const gift1 = (0, utils_1.buildGift)({
                token: 'gift-1',
                status: 'redeemed',
                redeemerMemberId: 'member_1',
                redeemedAt: new Date('2025-04-01T00:00:00.000Z'),
                consumesAt: new Date('2026-04-01T00:00:00.000Z')
            });
            const gift2 = (0, utils_1.buildGift)({
                token: 'gift-2',
                status: 'redeemed',
                redeemerMemberId: 'member_2',
                redeemedAt: new Date('2025-06-01T00:00:00.000Z'),
                consumesAt: new Date('2026-06-01T00:00:00.000Z')
            });
            giftRepository.findPendingConsumption.resolves([gift1, gift2]);
            giftRepository.getByToken
                .withArgs('gift-1', { transacting: 'trx', forUpdate: true }).resolves(gift1)
                .withArgs('gift-2', { transacting: 'trx', forUpdate: true }).resolves(gift2);
            memberRepository.get
                .withArgs({ id: 'member_1' }, { transacting: 'trx', forUpdate: true }).resolves({
                id: 'member_1',
                get: sinon_1.default.stub().withArgs('status').returns('gift')
            })
                .withArgs({ id: 'member_2' }, { transacting: 'trx', forUpdate: true }).resolves({
                id: 'member_2',
                get: sinon_1.default.stub().withArgs('status').returns('gift')
            });
            const service = createService();
            const result = await service.processConsumed();
            strict_1.default.equal(result.consumedCount, 2);
            strict_1.default.equal(result.updatedMemberCount, 2);
            strict_1.default.equal(memberRepository.update.callCount, 2);
            strict_1.default.equal(giftRepository.update.callCount, 2);
        });
    });
    describe('consume', function () {
        it('marks a redeemed gift as consumed and returns it', async function () {
            const gift = buildRedeemedGift();
            giftRepository.getByToken.resolves(gift);
            const service = createService();
            const result = await service.consume('gift-token');
            strict_1.default.ok(result);
            strict_1.default.equal(result.status, 'consumed');
            strict_1.default.notEqual(result.consumedAt, null);
            sinon_1.default.assert.calledOnce(giftRepository.transaction);
            sinon_1.default.assert.calledOnceWithExactly(giftRepository.getByToken, 'gift-token', { transacting: 'trx', forUpdate: true });
            sinon_1.default.assert.calledOnce(giftRepository.update);
            const [saved, options] = giftRepository.update.getCall(0).args;
            strict_1.default.equal(saved.status, 'consumed');
            strict_1.default.notEqual(saved.consumedAt, null);
            strict_1.default.deepEqual(options, { transacting: 'trx' });
        });
        it('returns null when the token does not exist', async function () {
            giftRepository.getByToken.resolves(null);
            const service = createService();
            const result = await service.consume('missing-token');
            strict_1.default.equal(result, null);
            sinon_1.default.assert.notCalled(giftRepository.update);
        });
        it('returns null when the gift is no longer in redeemed status', async function () {
            giftRepository.getByToken.resolves((0, utils_1.buildGift)({
                status: 'consumed',
                redeemerMemberId: 'member_1',
                redeemedAt: new Date('2025-04-01T00:00:00.000Z'),
                consumesAt: new Date('2026-04-01T00:00:00.000Z'),
                consumedAt: new Date('2026-04-01T00:00:00.000Z')
            }));
            const service = createService();
            const result = await service.consume('gift-token');
            strict_1.default.equal(result, null);
            sinon_1.default.assert.notCalled(giftRepository.update);
        });
        it('uses an external transaction when provided instead of creating its own', async function () {
            const gift = buildRedeemedGift();
            giftRepository.getByToken.resolves(gift);
            const service = createService();
            const externalTrx = 'external-trx';
            const result = await service.consume('gift-token', { transacting: externalTrx });
            strict_1.default.ok(result);
            strict_1.default.equal(result.status, 'consumed');
            sinon_1.default.assert.notCalled(giftRepository.transaction);
            sinon_1.default.assert.calledOnceWithExactly(giftRepository.getByToken, 'gift-token', { transacting: externalTrx, forUpdate: true });
            sinon_1.default.assert.calledOnceWithExactly(giftRepository.update, sinon_1.default.match.any, { transacting: externalTrx });
        });
        it('propagates errors from the repository update', async function () {
            const gift = buildRedeemedGift();
            giftRepository.getByToken.resolves(gift);
            giftRepository.update.rejects(new Error('DB error'));
            const service = createService();
            await strict_1.default.rejects(() => service.consume('gift-token'), { message: 'DB error' });
        });
    });
    describe('processExpired', function () {
        it('returns zero count when no gifts are pending expiration', async function () {
            giftRepository.findPendingExpiration.resolves([]);
            const service = createService();
            const result = await service.processExpired();
            strict_1.default.deepEqual(result, { expiredCount: 0 });
            sinon_1.default.assert.notCalled(giftRepository.update);
        });
        it('marks purchased gifts past their expiry as expired', async function () {
            const gift = (0, utils_1.buildGift)({
                status: 'purchased',
                expiresAt: new Date('2026-01-01T00:00:00.000Z')
            });
            giftRepository.findPendingExpiration.resolves([gift]);
            giftRepository.getByToken.resolves(gift);
            const service = createService();
            const result = await service.processExpired();
            strict_1.default.equal(result.expiredCount, 1);
            sinon_1.default.assert.calledOnce(giftRepository.transaction);
            sinon_1.default.assert.calledOnceWithExactly(giftRepository.getByToken, gift.token, { transacting: 'trx', forUpdate: true });
            sinon_1.default.assert.calledOnce(giftRepository.update);
            const savedGift = giftRepository.update.getCall(0).args[0];
            strict_1.default.equal(savedGift.status, 'expired');
            strict_1.default.notEqual(savedGift.expiredAt, null);
        });
        it('skips gifts that are no longer purchased when re-loaded', async function () {
            const gift = (0, utils_1.buildGift)({
                status: 'purchased',
                expiresAt: new Date('2026-01-01T00:00:00.000Z')
            });
            giftRepository.findPendingExpiration.resolves([gift]);
            giftRepository.getByToken.resolves((0, utils_1.buildGift)({
                status: 'redeemed',
                redeemedAt: new Date(),
                redeemerMemberId: 'member_1',
                consumesAt: new Date('2027-01-01T00:00:00.000Z')
            }));
            const service = createService();
            const result = await service.processExpired();
            strict_1.default.equal(result.expiredCount, 0);
            sinon_1.default.assert.notCalled(giftRepository.update);
        });
        it('handles multiple expired gifts', async function () {
            const gift1 = (0, utils_1.buildGift)({
                token: 'gift-1',
                status: 'purchased',
                expiresAt: new Date('2025-06-01T00:00:00.000Z')
            });
            const gift2 = (0, utils_1.buildGift)({
                token: 'gift-2',
                status: 'purchased',
                expiresAt: new Date('2025-12-01T00:00:00.000Z')
            });
            giftRepository.findPendingExpiration.resolves([gift1, gift2]);
            giftRepository.getByToken
                .withArgs('gift-1', { transacting: 'trx', forUpdate: true }).resolves(gift1)
                .withArgs('gift-2', { transacting: 'trx', forUpdate: true }).resolves(gift2);
            const service = createService();
            const result = await service.processExpired();
            strict_1.default.equal(result.expiredCount, 2);
            strict_1.default.equal(giftRepository.update.callCount, 2);
        });
    });
    describe('processReminders', function () {
        const MS_PER_DAY = 24 * 60 * 60 * 1000;
        it('returns zero counts when no gifts are pending reminders', async function () {
            giftRepository.findPendingReminder.resolves([]);
            const service = createService();
            const result = await service.processReminders();
            strict_1.default.deepEqual(result, { remindedCount: 0, skippedCount: 0, failedCount: 0 });
            sinon_1.default.assert.notCalled(giftEmailService.sendReminder);
            sinon_1.default.assert.notCalled(giftRepository.update);
        });
        it('queries the repository with the 7d/3d window', async function () {
            giftRepository.findPendingReminder.resolves([]);
            const before = Date.now();
            const service = createService();
            await service.processReminders();
            const after = Date.now();
            sinon_1.default.assert.calledOnce(giftRepository.findPendingReminder);
            const args = giftRepository.findPendingReminder.getCall(0).args[0];
            strict_1.default.equal(args.reminderLeadMs, 7 * MS_PER_DAY);
            strict_1.default.equal(args.reminderFloorMs, 3 * MS_PER_DAY);
            strict_1.default.ok(args.now.getTime() >= before);
            strict_1.default.ok(args.now.getTime() <= after);
        });
        it('sends the reminder, marks the gift as reminded, and returns counts', async function () {
            const gift = buildRedeemedGift();
            giftRepository.findPendingReminder.resolves([gift]);
            giftRepository.getByToken.resolves(gift);
            memberRepository.get.resolves(buildRedeemer());
            const service = createService();
            const result = await service.processReminders();
            strict_1.default.equal(result.remindedCount, 1);
            strict_1.default.equal(result.skippedCount, 0);
            strict_1.default.equal(result.failedCount, 0);
            sinon_1.default.assert.calledOnce(giftRepository.transaction);
            // getByToken is called twice: once unlocked (before the tier check) and
            // once locked (inside the transaction).
            strict_1.default.equal(giftRepository.getByToken.callCount, 2);
            sinon_1.default.assert.calledWithExactly(giftRepository.getByToken.firstCall, gift.token);
            sinon_1.default.assert.calledWithExactly(giftRepository.getByToken.secondCall, gift.token, { transacting: 'trx', forUpdate: true });
            sinon_1.default.assert.calledOnceWithExactly(memberRepository.get, { id: 'member_1' }, { transacting: 'trx', forUpdate: true });
            sinon_1.default.assert.calledOnce(giftEmailService.sendReminder);
            const emailArgs = giftEmailService.sendReminder.getCall(0).args[0];
            strict_1.default.equal(emailArgs.memberEmail, 'member_1@example.com');
            strict_1.default.equal(emailArgs.tierName, 'Bronze');
            strict_1.default.equal(emailArgs.tierCurrency, 'usd');
            strict_1.default.equal(emailArgs.tierPrice, 10000);
            strict_1.default.equal(emailArgs.cadence, gift.cadence);
            strict_1.default.equal(emailArgs.consumesAt, gift.consumesAt);
            sinon_1.default.assert.calledOnce(giftRepository.update);
            const savedGift = giftRepository.update.getCall(0).args[0];
            strict_1.default.notEqual(savedGift.consumesSoonReminderSentAt, null);
        });
        it('skips gifts no longer in redeemed status when re-loaded', async function () {
            const gift = buildRedeemedGift();
            giftRepository.findPendingReminder.resolves([gift]);
            giftRepository.getByToken.resolves((0, utils_1.buildGift)({
                status: 'refunded',
                refundedAt: new Date()
            }));
            const service = createService();
            const result = await service.processReminders();
            strict_1.default.equal(result.remindedCount, 0);
            strict_1.default.equal(result.skippedCount, 1);
            sinon_1.default.assert.notCalled(giftEmailService.sendReminder);
            sinon_1.default.assert.notCalled(giftRepository.update);
        });
        it('skips gifts that have already been reminded', async function () {
            const gift = buildRedeemedGift({
                consumesSoonReminderSentAt: new Date('2026-04-10T00:00:00.000Z')
            });
            giftRepository.findPendingReminder.resolves([gift]);
            giftRepository.getByToken.resolves(gift);
            const service = createService();
            const result = await service.processReminders();
            strict_1.default.equal(result.remindedCount, 0);
            strict_1.default.equal(result.skippedCount, 1);
            sinon_1.default.assert.notCalled(giftEmailService.sendReminder);
            sinon_1.default.assert.notCalled(giftRepository.update);
        });
        it('marks the gift as reminded but does not send when the redeemer has email_disabled', async function () {
            const gift = buildRedeemedGift();
            const memberGet = sinon_1.default.stub();
            memberGet.withArgs('email').returns('member@example.com');
            memberGet.withArgs('name').returns('Member Name');
            memberGet.withArgs('email_disabled').returns(true);
            giftRepository.findPendingReminder.resolves([gift]);
            giftRepository.getByToken.resolves(gift);
            memberRepository.get.resolves({ id: 'member_1', get: memberGet });
            const service = createService();
            const result = await service.processReminders();
            strict_1.default.equal(result.remindedCount, 0);
            strict_1.default.equal(result.skippedCount, 1);
            sinon_1.default.assert.notCalled(giftEmailService.sendReminder);
            sinon_1.default.assert.calledOnce(giftRepository.update);
            const savedGift = giftRepository.update.getCall(0).args[0];
            strict_1.default.notEqual(savedGift.consumesSoonReminderSentAt, null);
        });
        it('marks the gift as reminded but does not send when the redeemer no longer exists', async function () {
            const gift = buildRedeemedGift();
            giftRepository.findPendingReminder.resolves([gift]);
            giftRepository.getByToken.resolves(gift);
            memberRepository.get.resolves(null);
            const service = createService();
            const result = await service.processReminders();
            strict_1.default.equal(result.remindedCount, 0);
            strict_1.default.equal(result.skippedCount, 1);
            sinon_1.default.assert.notCalled(giftEmailService.sendReminder);
            sinon_1.default.assert.calledOnce(giftRepository.update);
            const savedGift = giftRepository.update.getCall(0).args[0];
            strict_1.default.notEqual(savedGift.consumesSoonReminderSentAt, null);
        });
        it('marks the gift as reminded before sending so a failed email does not cause a duplicate send on retry', async function () {
            // Mark-before-send trade: we accept the risk of a missed reminder on
            // email failure in exchange for the guarantee that no gift is ever
            // reminded twice. The failure is caught by processReminders'
            // per-gift try/catch and counted as a failure rather than propagated.
            const gift = buildRedeemedGift();
            giftRepository.findPendingReminder.resolves([gift]);
            giftRepository.getByToken.resolves(gift);
            memberRepository.get.resolves(buildRedeemer());
            giftEmailService.sendReminder.rejects(new Error('SMTP error'));
            const service = createService();
            const result = await service.processReminders();
            strict_1.default.equal(result.remindedCount, 0);
            strict_1.default.equal(result.skippedCount, 0);
            strict_1.default.equal(result.failedCount, 1);
            // The reminder-sent marker was committed before the email was attempted.
            sinon_1.default.assert.calledOnce(giftRepository.update);
            const marked = giftRepository.update.getCall(0).args[0];
            strict_1.default.notEqual(marked.consumesSoonReminderSentAt, null);
            // And the update call finished before sendReminder was invoked.
            sinon_1.default.assert.callOrder(giftRepository.update, giftEmailService.sendReminder);
        });
        it('does not mark the gift as reminded when the tier is missing so an admin fix recovers the reminder', async function () {
            const gift = buildRedeemedGift();
            giftRepository.findPendingReminder.resolves([gift]);
            giftRepository.getByToken.resolves(gift);
            tiersService.api.read.resolves(null);
            const service = createService();
            const result = await service.processReminders();
            strict_1.default.equal(result.remindedCount, 0);
            strict_1.default.equal(result.skippedCount, 0);
            strict_1.default.equal(result.failedCount, 1);
            // Tier is read up front, but the transaction never runs, so the gift
            // is neither locked nor marked as reminded. A follow-up run after the
            // tier is restored will pick the gift up again.
            sinon_1.default.assert.notCalled(giftRepository.update);
            sinon_1.default.assert.notCalled(giftEmailService.sendReminder);
        });
        it('does not mark the gift as reminded when tier pricing is missing for the gift cadence', async function () {
            const gift = buildRedeemedGift({ cadence: 'year' });
            giftRepository.findPendingReminder.resolves([gift]);
            giftRepository.getByToken.resolves(gift);
            tiersService.api.read.resolves({
                id: 'tier_1',
                name: 'Bronze',
                currency: 'usd',
                monthlyPrice: 1000,
                yearlyPrice: null
            });
            const service = createService();
            const result = await service.processReminders();
            strict_1.default.equal(result.remindedCount, 0);
            strict_1.default.equal(result.skippedCount, 0);
            strict_1.default.equal(result.failedCount, 1);
            sinon_1.default.assert.notCalled(giftRepository.update);
            sinon_1.default.assert.notCalled(giftEmailService.sendReminder);
        });
        it('continues processing the batch when one gift fails', async function () {
            // Gift 1 will fail at the email stage; gift 2 should still be processed.
            const gift1 = buildRedeemedGift({ token: 'gift-1', redeemerMemberId: 'member_1' });
            const gift2 = buildRedeemedGift({ token: 'gift-2', redeemerMemberId: 'member_2' });
            giftRepository.findPendingReminder.resolves([gift1, gift2]);
            // getByToken resolves regardless of whether the lock options are passed.
            giftRepository.getByToken
                .withArgs('gift-1').resolves(gift1)
                .withArgs('gift-1', sinon_1.default.match.any).resolves(gift1)
                .withArgs('gift-2').resolves(gift2)
                .withArgs('gift-2', sinon_1.default.match.any).resolves(gift2);
            memberRepository.get
                .withArgs({ id: 'member_1' }, sinon_1.default.match.any).resolves(buildRedeemer('member_1'))
                .withArgs({ id: 'member_2' }, sinon_1.default.match.any).resolves(buildRedeemer('member_2'));
            giftEmailService.sendReminder
                .onFirstCall().rejects(new Error('Transient SMTP error'))
                .onSecondCall().resolves(undefined);
            const service = createService();
            const result = await service.processReminders();
            strict_1.default.equal(result.remindedCount, 1);
            strict_1.default.equal(result.skippedCount, 0);
            strict_1.default.equal(result.failedCount, 1);
            // Both gifts were claimed (marked as reminded inside their transactions),
            // and both emails were attempted.
            strict_1.default.equal(giftRepository.update.callCount, 2);
            strict_1.default.equal(giftEmailService.sendReminder.callCount, 2);
        });
        it('handles multiple gifts independently', async function () {
            const gift1 = buildRedeemedGift({ token: 'gift-1', redeemerMemberId: 'member_1' });
            const gift2 = buildRedeemedGift({ token: 'gift-2', redeemerMemberId: 'member_2' });
            giftRepository.findPendingReminder.resolves([gift1, gift2]);
            giftRepository.getByToken
                .withArgs('gift-1').resolves(gift1)
                .withArgs('gift-1', sinon_1.default.match.any).resolves(gift1)
                .withArgs('gift-2').resolves(gift2)
                .withArgs('gift-2', sinon_1.default.match.any).resolves(gift2);
            memberRepository.get
                .withArgs({ id: 'member_1' }, sinon_1.default.match.any).resolves(buildRedeemer('member_1'))
                .withArgs({ id: 'member_2' }, sinon_1.default.match.any).resolves(buildRedeemer('member_2'));
            const service = createService();
            const result = await service.processReminders();
            strict_1.default.equal(result.remindedCount, 2);
            strict_1.default.equal(result.skippedCount, 0);
            strict_1.default.equal(result.failedCount, 0);
            strict_1.default.equal(giftEmailService.sendReminder.callCount, 2);
            strict_1.default.equal(giftRepository.update.callCount, 2);
        });
    });
    describe('redeem', function () {
        it('redeems the gift, saves it, and grants gift access to the member', async function () {
            const gift = (0, utils_1.buildGift)();
            const memberGet = sinon_1.default.stub();
            memberGet.withArgs('status').returns('free');
            memberGet.withArgs('name').returns('Member Name');
            memberGet.withArgs('email').returns('member@example.com');
            giftRepository.getByToken.resolves(gift);
            memberRepository.get.resolves({
                id: 'member_1',
                get: memberGet
            });
            const service = createService();
            const redeemed = await service.redeem('gift-token', 'member_1');
            sinon_1.default.assert.calledOnce(giftRepository.transaction);
            sinon_1.default.assert.calledOnceWithExactly(giftRepository.getByToken, 'gift-token', { transacting: 'trx', forUpdate: true });
            sinon_1.default.assert.calledOnceWithExactly(memberRepository.get, { id: 'member_1' }, { transacting: 'trx', forUpdate: true });
            sinon_1.default.assert.calledOnceWithExactly(memberRepository.update, {
                products: [{
                        id: 'tier_1',
                        expiry_at: redeemed.consumesAt
                    }],
                status: 'gift'
            }, {
                id: 'member_1',
                transacting: 'trx'
            });
            sinon_1.default.assert.calledOnceWithExactly(giftRepository.update, redeemed, { transacting: 'trx' });
            sinon_1.default.assert.calledOnceWithExactly(tiersService.api.read, 'tier_1');
            sinon_1.default.assert.calledOnceWithExactly(staffServiceEmails.notifyGiftSubscriptionStarted, {
                memberId: 'member_1',
                memberEmail: 'member@example.com',
                memberName: 'Member Name',
                tierName: 'Bronze',
                cadence: 'year',
                duration: 1,
                buyerEmail: 'buyer@example.com'
            });
            strict_1.default.equal(redeemed.status, 'redeemed');
            strict_1.default.equal(redeemed.redeemerMemberId, 'member_1');
            strict_1.default.notEqual(redeemed.consumesAt, null);
        });
        it('does not fail redemption when staff notification email throws', async function () {
            const gift = (0, utils_1.buildGift)();
            const memberGet = sinon_1.default.stub();
            memberGet.withArgs('status').returns('free');
            memberGet.withArgs('name').returns('Member Name');
            memberGet.withArgs('email').returns('member@example.com');
            giftRepository.getByToken.resolves(gift);
            memberRepository.get.resolves({
                id: 'member_1',
                get: memberGet
            });
            staffServiceEmails.notifyGiftSubscriptionStarted.rejects(new Error('SMTP error'));
            const service = createService();
            const redeemed = await service.redeem('gift-token', 'member_1');
            strict_1.default.equal(redeemed.status, 'redeemed');
            sinon_1.default.assert.calledOnce(staffServiceEmails.notifyGiftSubscriptionStarted);
        });
        it('uses an external transaction when provided instead of creating its own', async function () {
            const gift = (0, utils_1.buildGift)();
            giftRepository.getByToken.resolves(gift);
            memberRepository.get.resolves({
                id: 'member_1',
                get: sinon_1.default.stub().withArgs('status').returns('free')
            });
            const service = createService();
            const externalTrx = { executionPromise: Promise.resolve() };
            const redeemed = await service.redeem('gift-token', 'member_1', { transacting: externalTrx });
            sinon_1.default.assert.notCalled(giftRepository.transaction);
            sinon_1.default.assert.calledOnceWithExactly(giftRepository.getByToken, 'gift-token', { transacting: externalTrx, forUpdate: true });
            sinon_1.default.assert.calledOnceWithExactly(memberRepository.get, { id: 'member_1' }, { transacting: externalTrx, forUpdate: true });
            sinon_1.default.assert.calledOnceWithExactly(memberRepository.update, {
                products: [{
                        id: 'tier_1',
                        expiry_at: redeemed.consumesAt
                    }],
                status: 'gift'
            }, {
                id: 'member_1',
                transacting: externalTrx
            });
            sinon_1.default.assert.calledOnceWithExactly(giftRepository.update, redeemed, { transacting: externalTrx });
            strict_1.default.equal(redeemed.status, 'redeemed');
        });
        it('allows a newly created gift member to redeem when newMember is true', async function () {
            const gift = (0, utils_1.buildGift)();
            giftRepository.getByToken.resolves(gift);
            memberRepository.get.resolves({
                id: 'member_1',
                get: sinon_1.default.stub().withArgs('status').returns('gift')
            });
            const service = createService();
            const redeemed = await service.redeem('gift-token', 'member_1', { newMember: true });
            sinon_1.default.assert.calledOnce(giftRepository.transaction);
            sinon_1.default.assert.calledOnceWithExactly(memberRepository.get, { id: 'member_1' }, { transacting: 'trx', forUpdate: true });
            sinon_1.default.assert.calledOnceWithExactly(giftRepository.getByToken, 'gift-token', { transacting: 'trx', forUpdate: true });
            sinon_1.default.assert.calledOnceWithExactly(memberRepository.update, {
                products: [{
                        id: 'tier_1',
                        expiry_at: redeemed.consumesAt
                    }],
                status: 'gift'
            }, {
                id: 'member_1',
                transacting: 'trx'
            });
            sinon_1.default.assert.calledOnceWithExactly(giftRepository.update, redeemed, { transacting: 'trx' });
            strict_1.default.equal(redeemed.status, 'redeemed');
        });
        it('throws NotFoundError when the member does not exist', async function () {
            memberRepository.get.onFirstCall().resolves(null);
            const service = createService();
            await strict_1.default.rejects(() => service.redeem('gift-token', 'missing-member'), (err) => {
                strict_1.default.equal(err.errorType, 'NotFoundError');
                strict_1.default.equal(err.message, 'Member not found: missing-member');
                return true;
            });
            sinon_1.default.assert.notCalled(memberRepository.update);
            sinon_1.default.assert.notCalled(giftRepository.update);
            sinon_1.default.assert.notCalled(staffServiceEmails.notifyGiftSubscriptionStarted);
        });
        it('throws NotFoundError when the gift token does not exist', async function () {
            giftRepository.getByToken.resolves(null);
            const service = createService();
            await strict_1.default.rejects(() => service.redeem('missing-token', 'member_1'), (err) => {
                strict_1.default.equal(err.errorType, 'NotFoundError');
                strict_1.default.equal(err.message, 'This gift does not exist.');
                return true;
            });
            sinon_1.default.assert.notCalled(memberRepository.update);
            sinon_1.default.assert.notCalled(giftRepository.update);
            sinon_1.default.assert.notCalled(staffServiceEmails.notifyGiftSubscriptionStarted);
        });
        it('throws BadRequestError when the member is not eligible', async function () {
            giftRepository.getByToken.resolves((0, utils_1.buildGift)());
            memberRepository.get.resolves({
                id: 'member_1',
                get: sinon_1.default.stub().withArgs('status').returns('paid')
            });
            const service = createService();
            await strict_1.default.rejects(() => service.redeem('gift-token', 'member_1'), (err) => {
                strict_1.default.equal(err.errorType, 'BadRequestError');
                strict_1.default.equal(err.message, 'You already have an active subscription.');
                return true;
            });
            sinon_1.default.assert.notCalled(memberRepository.update);
            sinon_1.default.assert.notCalled(giftRepository.update);
            sinon_1.default.assert.notCalled(staffServiceEmails.notifyGiftSubscriptionStarted);
        });
    });
    describe('scheduleReminder (via redeem)', function () {
        const apiUrl = 'https://example.com/ghost/api/admin';
        function buildSchedulerDeps() {
            const schedule = sinon_1.default.stub();
            const getSignedAdminToken = sinon_1.default.stub().returns('signed-token');
            const urlJoin = sinon_1.default.stub().callsFake((...parts) => parts.join('/'));
            return {
                schedulerAdapter: { schedule },
                schedulerIntegration: { api_keys: [{ id: 'key-id', secret: '00'.repeat(32) }] },
                getSignedAdminToken,
                urlJoin,
                apiUrl
            };
        }
        function stubRedeemer() {
            const memberGet = sinon_1.default.stub();
            memberGet.withArgs('status').returns('free');
            memberGet.withArgs('name').returns('Member Name');
            memberGet.withArgs('email').returns('member@example.com');
            memberRepository.get.resolves({ id: 'member_1', get: memberGet });
        }
        it('schedules a reminder 7 days before consumes_at after redeem commits', async function () {
            stubRedeemer();
            const gift = (0, utils_1.buildGift)();
            giftRepository.getByToken.resolves(gift);
            const deps = buildSchedulerDeps();
            const service = createService(deps);
            const redeemed = await service.redeem('gift-token', 'member_1');
            strict_1.default.ok(redeemed.consumesAt);
            const expectedTime = redeemed.consumesAt.getTime() - 7 * 24 * 60 * 60 * 1000;
            sinon_1.default.assert.calledOnce(deps.schedulerAdapter.schedule);
            const [job] = deps.schedulerAdapter.schedule.getCall(0).args;
            strict_1.default.equal(job.time, expectedTime);
            strict_1.default.equal(job.extra.httpMethod, 'PUT');
            strict_1.default.equal(job.url, `${apiUrl}/gifts/flush_reminders?token=signed-token`);
            sinon_1.default.assert.calledOnceWithExactly(deps.getSignedAdminToken, {
                publishedAt: new Date(expectedTime).toISOString(),
                apiUrl,
                integration: deps.schedulerIntegration
            });
        });
        it('does NOT schedule a reminder when scheduler deps are absent', async function () {
            stubRedeemer();
            const gift = (0, utils_1.buildGift)();
            giftRepository.getByToken.resolves(gift);
            // No scheduler deps at all
            const service = createService();
            await service.redeem('gift-token', 'member_1');
            // If we got here without throwing, the no-op path worked.
            // Explicit assertion: staff notification still ran.
            sinon_1.default.assert.calledOnce(staffServiceEmails.notifyGiftSubscriptionStarted);
        });
        it('does NOT schedule a reminder when only some scheduler deps are present', async function () {
            stubRedeemer();
            const gift = (0, utils_1.buildGift)();
            giftRepository.getByToken.resolves(gift);
            const schedule = sinon_1.default.stub();
            // schedulerAdapter provided but apiUrl missing
            const service = createService({
                schedulerAdapter: { schedule },
                schedulerIntegration: null,
                getSignedAdminToken: sinon_1.default.stub(),
                urlJoin: sinon_1.default.stub(),
                apiUrl: null
            });
            await service.redeem('gift-token', 'member_1');
            sinon_1.default.assert.notCalled(schedule);
        });
        it('logs but does not throw when getSignedAdminToken throws', async function () {
            stubRedeemer();
            const gift = (0, utils_1.buildGift)();
            giftRepository.getByToken.resolves(gift);
            const deps = buildSchedulerDeps();
            deps.getSignedAdminToken.throws(new Error('JWT signing failed'));
            const service = createService(deps);
            // Should not throw — error is caught and logged.
            const redeemed = await service.redeem('gift-token', 'member_1');
            strict_1.default.equal(redeemed.status, 'redeemed');
            sinon_1.default.assert.notCalled(deps.schedulerAdapter.schedule);
        });
        it('schedules the reminder even when staff notification fails', async function () {
            stubRedeemer();
            const gift = (0, utils_1.buildGift)();
            giftRepository.getByToken.resolves(gift);
            staffServiceEmails.notifyGiftSubscriptionStarted.rejects(new Error('SMTP error'));
            const deps = buildSchedulerDeps();
            const service = createService(deps);
            await service.redeem('gift-token', 'member_1');
            sinon_1.default.assert.calledOnce(deps.schedulerAdapter.schedule);
        });
        it('schedules a reminder when redeem uses an external transaction (after commit)', async function () {
            stubRedeemer();
            const gift = (0, utils_1.buildGift)();
            giftRepository.getByToken.resolves(gift);
            const deps = buildSchedulerDeps();
            const service = createService(deps);
            const externalTrx = { executionPromise: Promise.resolve() };
            await service.redeem('gift-token', 'member_1', { transacting: externalTrx });
            // Wait for the post-commit notify callback to run.
            await externalTrx.executionPromise;
            // One more microtask flush for the .then chain.
            await new Promise((resolve) => {
                setImmediate(resolve);
            });
            sinon_1.default.assert.calledOnce(deps.schedulerAdapter.schedule);
        });
        it('does NOT schedule a reminder when an external transaction rolls back', async function () {
            stubRedeemer();
            const gift = (0, utils_1.buildGift)();
            giftRepository.getByToken.resolves(gift);
            const deps = buildSchedulerDeps();
            const service = createService(deps);
            const rejection = Promise.reject(new Error('rolled back'));
            // Suppress unhandled rejection warning
            rejection.catch(() => { });
            const externalTrx = { executionPromise: rejection };
            await service.redeem('gift-token', 'member_1', { transacting: externalTrx });
            // Wait for the .then(notify, () => {}) reject branch.
            await new Promise((resolve) => {
                setImmediate(resolve);
            });
            sinon_1.default.assert.notCalled(deps.schedulerAdapter.schedule);
        });
    });
    describe('refund', function () {
        it('saves a refunded gift and returns true', async function () {
            const gift = (0, utils_1.buildGift)();
            giftRepository.getByPaymentIntentId.resolves(gift);
            const service = createService();
            const result = await service.refund('pi_456');
            strict_1.default.equal(result, true);
            sinon_1.default.assert.calledOnce(giftRepository.update);
            const [saved, options] = giftRepository.update.getCall(0).args;
            strict_1.default.equal(saved.status, 'refunded');
            strict_1.default.ok(saved.refundedAt);
            strict_1.default.notEqual(saved, gift);
            strict_1.default.deepEqual(options, { transacting: 'trx' });
        });
        it('returns false when no gift matches the payment intent', async function () {
            giftRepository.getByPaymentIntentId.resolves(null);
            const service = createService();
            const result = await service.refund('pi_unknown');
            strict_1.default.equal(result, false);
            sinon_1.default.assert.notCalled(giftRepository.update);
        });
        it('downgrades the redeemer to free when the gift was redeemed', async function () {
            const gift = (0, utils_1.buildGift)({
                status: 'redeemed',
                redeemerMemberId: 'redeemer_1',
                redeemedAt: new Date('2026-02-01T00:00:00.000Z'),
                consumesAt: new Date('2027-02-01T00:00:00.000Z')
            });
            giftRepository.getByPaymentIntentId.resolves(gift);
            memberRepository.get.resolves({
                id: 'redeemer_1',
                get: sinon_1.default.stub().withArgs('status').returns('gift')
            });
            const service = createService();
            const result = await service.refund('pi_456');
            strict_1.default.equal(result, true);
            sinon_1.default.assert.calledOnce(giftRepository.update);
            sinon_1.default.assert.calledOnce(giftRepository.transaction);
            sinon_1.default.assert.calledOnceWithExactly(memberRepository.get, { id: 'redeemer_1' }, { transacting: 'trx' });
            sinon_1.default.assert.calledOnceWithExactly(memberRepository.update, {
                products: [],
                status: 'free'
            }, { id: 'redeemer_1', transacting: 'trx' });
        });
        it('does not downgrade when the gift was not redeemed', async function () {
            const gift = (0, utils_1.buildGift)();
            giftRepository.getByPaymentIntentId.resolves(gift);
            const service = createService();
            await service.refund('pi_456');
            sinon_1.default.assert.notCalled(memberRepository.get);
            sinon_1.default.assert.notCalled(memberRepository.update);
        });
        it('does not downgrade when the redeemer is no longer in gift status', async function () {
            const gift = (0, utils_1.buildGift)({
                status: 'redeemed',
                redeemerMemberId: 'redeemer_1',
                redeemedAt: new Date('2026-02-01T00:00:00.000Z'),
                consumesAt: new Date('2027-02-01T00:00:00.000Z')
            });
            giftRepository.getByPaymentIntentId.resolves(gift);
            memberRepository.get.resolves({
                id: 'redeemer_1',
                get: sinon_1.default.stub().withArgs('status').returns('paid')
            });
            const service = createService();
            const result = await service.refund('pi_456');
            strict_1.default.equal(result, true);
            sinon_1.default.assert.calledOnce(giftRepository.update);
            sinon_1.default.assert.notCalled(memberRepository.update);
        });
        it('throws when member downgrade fails', async function () {
            const gift = (0, utils_1.buildGift)({
                status: 'redeemed',
                redeemerMemberId: 'redeemer_1',
                redeemedAt: new Date('2026-02-01T00:00:00.000Z'),
                consumesAt: new Date('2027-02-01T00:00:00.000Z')
            });
            giftRepository.getByPaymentIntentId.resolves(gift);
            memberRepository.get.resolves({
                id: 'redeemer_1',
                get: sinon_1.default.stub().withArgs('status').returns('gift')
            });
            memberRepository.update.rejects(new Error('Cannot remove product with active subscription'));
            const service = createService();
            await strict_1.default.rejects(() => service.refund('pi_456'), { message: 'Cannot remove product with active subscription' });
            strict_1.default.equal(gift.status, 'redeemed');
        });
        it('returns true without saving when gift is already refunded', async function () {
            const gift = (0, utils_1.buildGift)({
                status: 'refunded',
                refundedAt: new Date('2026-02-01T00:00:00.000Z')
            });
            giftRepository.getByPaymentIntentId.resolves(gift);
            const service = createService();
            const result = await service.refund('pi_456');
            strict_1.default.equal(result, true);
            sinon_1.default.assert.notCalled(giftRepository.update);
        });
    });
    describe('getActiveByMember', function () {
        const MS_PER_DAY = 24 * 60 * 60 * 1000;
        const daysFromNow = (days) => new Date(Date.now() + days * MS_PER_DAY);
        it('returns the redeemed gift from the repository', async function () {
            const gift = (0, utils_1.buildGift)({
                status: 'redeemed',
                redeemerMemberId: 'member_1',
                redeemedAt: daysFromNow(-30),
                consumesAt: daysFromNow(335)
            });
            giftRepository.getActiveByMember.resolves(gift);
            const service = createService();
            const result = await service.getActiveByMember('member_1');
            strict_1.default.equal(result, gift);
            sinon_1.default.assert.calledOnceWithExactly(giftRepository.getActiveByMember, 'member_1');
        });
        it('returns null when the repository has no redeemed gift for the member', async function () {
            giftRepository.getActiveByMember.resolves(null);
            const service = createService();
            const result = await service.getActiveByMember('member_without_gift');
            strict_1.default.equal(result, null);
        });
        it('returns null without hitting the repository when memberId is falsy', async function () {
            const service = createService();
            const result = await service.getActiveByMember('');
            strict_1.default.equal(result, null);
            sinon_1.default.assert.notCalled(giftRepository.getActiveByMember);
        });
    });
    describe('getRemainingActiveDays', function () {
        const MS_PER_DAY = 24 * 60 * 60 * 1000;
        let now;
        let redeemedAt;
        const daysFromNow = (days) => new Date(now.getTime() + days * MS_PER_DAY);
        beforeEach(function () {
            now = new Date();
            redeemedAt = new Date(now.getTime() - 30 * MS_PER_DAY);
        });
        it('returns 0 when the gift has not been redeemed', function () {
            const gift = (0, utils_1.buildGift)({
                status: 'purchased',
                redeemedAt: null,
                consumesAt: daysFromNow(10)
            });
            const service = createService();
            strict_1.default.equal(service.getRemainingActiveDays(gift, now), 0);
        });
        it('returns 0 when a redeemed gift has no consumesAt', function () {
            const gift = (0, utils_1.buildGift)({
                status: 'redeemed',
                redeemedAt,
                consumesAt: null
            });
            const service = createService();
            strict_1.default.equal(service.getRemainingActiveDays(gift, now), 0);
        });
        it('returns 0 when the redeemed gift has already been consumed', function () {
            const consumedAt = daysFromNow(-1);
            const gift = (0, utils_1.buildGift)({
                status: 'consumed',
                redeemedAt,
                consumesAt: consumedAt,
                consumedAt
            });
            const service = createService();
            strict_1.default.equal(service.getRemainingActiveDays(gift, now), 0);
        });
        it('returns the number of whole days until consumesAt, rounded up', function () {
            const gift = (0, utils_1.buildGift)({
                status: 'redeemed',
                redeemedAt,
                consumesAt: daysFromNow(10.5)
            });
            const service = createService();
            // 10.5 days → ceil → 11
            strict_1.default.equal(service.getRemainingActiveDays(gift, now), 11);
        });
        it('returns 0 when consumesAt is in the past', function () {
            const gift = (0, utils_1.buildGift)({
                status: 'redeemed',
                redeemedAt,
                consumesAt: daysFromNow(-5)
            });
            const service = createService();
            strict_1.default.equal(service.getRemainingActiveDays(gift, now), 0);
        });
        it('returns 0 when consumesAt equals now', function () {
            const gift = (0, utils_1.buildGift)({
                status: 'redeemed',
                redeemedAt,
                consumesAt: now
            });
            const service = createService();
            strict_1.default.equal(service.getRemainingActiveDays(gift, now), 0);
        });
        it('defaults `now` to the current time when omitted', function () {
            const consumesAt = daysFromNow(5);
            const gift = (0, utils_1.buildGift)({
                status: 'redeemed',
                redeemedAt,
                consumesAt
            });
            const service = createService();
            const result = service.getRemainingActiveDays(gift);
            strict_1.default.ok(result === 5 || result === 4, `expected 4 or 5, got ${result}`);
        });
    });
});
