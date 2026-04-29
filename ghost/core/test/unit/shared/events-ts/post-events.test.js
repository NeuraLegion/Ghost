"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("assert/strict"));
const events_ts_1 = require("../../../../core/shared/events-ts");
describe('Post Events', function () {
    it('Can instantiate PostDeletedEvent', function () {
        const event = events_ts_1.PostDeletedEvent.create({ id: 'post-id-1', data: {} });
        strict_1.default.ok(event);
        strict_1.default.equal(event.id, 'post-id-1');
    });
    it('Can instantiate BulkDestroyEvent', function () {
        const event = events_ts_1.PostsBulkDestroyedEvent.create(['1', '2', '3']);
        strict_1.default.ok(event);
        strict_1.default.equal(event.data.length, 3);
    });
    it('Can instantiate PostsBulkUnpublishedEvent', function () {
        const event = events_ts_1.PostsBulkUnpublishedEvent.create(['1', '2', '3']);
        strict_1.default.ok(event);
        strict_1.default.equal(event.data.length, 3);
    });
    it('Can instantiate PostsBulkUnscheduledEvent', function () {
        const event = events_ts_1.PostsBulkUnscheduledEvent.create(['1', '2', '3']);
        strict_1.default.ok(event);
        strict_1.default.equal(event.data.length, 3);
    });
    it('Can instantiate PostsBulkFeaturedEvent', function () {
        const event = events_ts_1.PostsBulkFeaturedEvent.create(['1', '2', '3']);
        strict_1.default.ok(event);
        strict_1.default.equal(event.data.length, 3);
    });
    it('Can instantiate PostsBulkUnfeaturedEvent', function () {
        const event = events_ts_1.PostsBulkUnfeaturedEvent.create(['1', '2', '3']);
        strict_1.default.ok(event);
        strict_1.default.equal(event.data.length, 3);
    });
    it('Can instantiate PostsBulkAddTagsEvent', function () {
        const event = events_ts_1.PostsBulkAddTagsEvent.create(['1', '2', '3']);
        strict_1.default.ok(event);
        strict_1.default.equal(event.data.length, 3);
    });
});
