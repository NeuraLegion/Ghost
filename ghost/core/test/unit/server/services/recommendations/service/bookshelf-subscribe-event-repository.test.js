"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("assert/strict"));
const service_1 = require("../../../../../../core/server/services/recommendations/service");
const sinon_1 = __importDefault(require("sinon"));
describe('BookshelfSubscribeEventRepository', function () {
    afterEach(function () {
        sinon_1.default.restore();
    });
    it('toPrimitive', async function () {
        const repository = new service_1.BookshelfSubscribeEventRepository({}, {
            sentry: undefined
        });
        strict_1.default.deepEqual(repository.toPrimitive(service_1.SubscribeEvent.create({
            id: 'id',
            recommendationId: 'recommendationId',
            memberId: 'memberId',
            createdAt: new Date('2021-01-01')
        })), {
            id: 'id',
            recommendation_id: 'recommendationId',
            member_id: 'memberId',
            created_at: new Date('2021-01-01')
        });
    });
    it('modelToEntity', async function () {
        const repository = new service_1.BookshelfSubscribeEventRepository({}, {
            sentry: undefined
        });
        const entity = repository.modelToEntity({
            id: 'id',
            get: (key) => {
                return {
                    recommendation_id: 'recommendationId',
                    member_id: 'memberId',
                    created_at: new Date('2021-01-01')
                }[key];
            }
        });
        strict_1.default.deepEqual(entity, service_1.SubscribeEvent.create({
            id: 'id',
            recommendationId: 'recommendationId',
            memberId: 'memberId',
            createdAt: new Date('2021-01-01')
        }));
    });
    it('modelToEntity returns null on errors', async function () {
        const captureException = sinon_1.default.stub();
        const repository = new service_1.BookshelfSubscribeEventRepository({}, {
            sentry: {
                captureException
            }
        });
        sinon_1.default.stub(service_1.SubscribeEvent, 'create').throws(new Error('test'));
        const entity = repository.modelToEntity({
            id: 'id',
            get: (key) => {
                return {
                    recommendation_id: 'recommendationId',
                    member_id: 'memberId',
                    created_at: new Date('2021-01-01')
                }[key];
            }
        });
        strict_1.default.deepEqual(entity, null);
        sinon_1.default.assert.calledOnce(captureException);
    });
    it('getFieldToColumnMap returns', async function () {
        const captureException = sinon_1.default.stub();
        const repository = new service_1.BookshelfSubscribeEventRepository({}, {
            sentry: {
                captureException
            }
        });
        strict_1.default.ok(repository.getFieldToColumnMap());
    });
});
