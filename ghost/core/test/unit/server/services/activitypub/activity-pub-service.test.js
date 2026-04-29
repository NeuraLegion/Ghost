"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("assert/strict"));
const activity_pub_service_1 = require("../../../../../core/server/services/activitypub/activity-pub-service");
const knex_1 = __importDefault(require("knex"));
const nock_1 = __importDefault(require("nock"));
async function getKnexInstance() {
    const knexInstance = (0, knex_1.default)({
        client: 'sqlite',
        connection: {
            filename: ':memory:'
        },
        useNullAsDefault: true
    });
    await knexInstance.schema.createTable('users', (table) => {
        table.string('id').primary();
        table.string('email');
    });
    await knexInstance.schema.createTable('roles', (table) => {
        table.string('id').primary();
        table.string('name');
    });
    await knexInstance.schema.createTable('roles_users', (table) => {
        table.string('id').primary();
        table.string('user_id').references('users.id');
        table.string('role_id').references('roles.id');
    });
    await knexInstance.schema.createTable('integrations', (table) => {
        table.string('id').primary();
        table.string('slug');
        table.string('type');
    });
    await knexInstance.schema.createTable('webhooks', (table) => {
        table.string('id').primary();
        table.string('event');
        table.string('target_url');
        table.string('api_version');
        table.string('name');
        table.string('secret');
        table.string('integration_id');
        table.datetime('created_at');
    });
    await knexInstance.insert({
        id: 'owner-role-id',
        name: 'Owner'
    }).into('roles');
    return knexInstance;
}
async function addOwnerUser(knexInstance) {
    await knexInstance.insert({
        id: 'non-standard-id',
        email: 'owner@user.com'
    }).into('users');
    await knexInstance.insert({
        id: 'roles-users-id',
        user_id: 'non-standard-id',
        role_id: 'owner-role-id'
    }).into('roles_users');
}
async function addActivityPubIntegration(knexInstance) {
    await knexInstance.insert({
        id: 'integration_id',
        slug: 'ghost-activitypub',
        type: 'internal'
    }).into('integrations');
}
describe('ActivityPubService', function () {
    it('Can initialise the webhooks', async function () {
        const knexInstance = await getKnexInstance();
        await addOwnerUser(knexInstance);
        await addActivityPubIntegration(knexInstance);
        const siteUrl = new URL('http://fake-site-url');
        const scope = (0, nock_1.default)(siteUrl)
            .get('/.ghost/activitypub/v1/site/')
            .matchHeader('authorization', 'Bearer token:owner@user.com:Owner')
            .reply(200, {
            webhook_secret: 'webhook_secret_baby!!'
        });
        const logging = console;
        const identityTokenService = {
            getTokenForUser(email, role) {
                return `token:${email}:${role}`;
            }
        };
        const service = new activity_pub_service_1.ActivityPubService(knexInstance, siteUrl, logging, identityTokenService);
        await service.initialiseWebhooks();
        (0, strict_1.default)(scope.isDone(), 'Expected the ActivityPub site endpoint to be called');
        const webhooks = await knexInstance.select('*').from('webhooks');
        const expectedWebhookCount = 4;
        const expectedWebhookSecret = 'webhook_secret_baby!!';
        const expectedWebhookIntegrationId = 'integration_id';
        strict_1.default.equal(webhooks.length, expectedWebhookCount);
        for (const webhook of webhooks) {
            strict_1.default.equal(webhook.secret, expectedWebhookSecret);
            strict_1.default.equal(webhook.integration_id, expectedWebhookIntegrationId);
        }
        await knexInstance.destroy();
    });
    it('Will not reinitialise webhooks if they are already good', async function () {
        const knexInstance = await getKnexInstance();
        await addOwnerUser(knexInstance);
        await addActivityPubIntegration(knexInstance);
        const siteUrl = new URL('http://fake-site-url');
        const scope = (0, nock_1.default)(siteUrl)
            .get('/.ghost/activitypub/v1/site/')
            .matchHeader('authorization', 'Bearer token:owner@user.com:Owner')
            .reply(200, {
            webhook_secret: 'webhook_secret_baby!!'
        });
        const logging = console;
        const identityTokenService = {
            getTokenForUser(email, role) {
                return `token:${email}:${role}`;
            }
        };
        const service = new activity_pub_service_1.ActivityPubService(knexInstance, siteUrl, logging, identityTokenService);
        await service.initialiseWebhooks();
        (0, strict_1.default)(scope.isDone(), 'Expected the ActivityPub site endpoint to be called');
        const webhooks = await knexInstance.select('*').from('webhooks');
        const expectedWebhookCount = 4;
        const expectedWebhookSecret = 'webhook_secret_baby!!';
        const expectedWebhookIntegrationId = 'integration_id';
        strict_1.default.equal(webhooks.length, expectedWebhookCount);
        for (const webhook of webhooks) {
            strict_1.default.equal(webhook.secret, expectedWebhookSecret);
            strict_1.default.equal(webhook.integration_id, expectedWebhookIntegrationId);
        }
        (0, nock_1.default)(siteUrl)
            .get('/.ghost/activitypub/v1/site/')
            .matchHeader('authorization', 'Bearer token:owner@user.com:Owner')
            .reply(200, {
            webhook_secret: 'webhook_secret_baby!!'
        });
        await service.initialiseWebhooks();
        const webhooksAfterSecondInitialisation = await knexInstance.select('*').from('webhooks');
        strict_1.default.deepEqual(webhooksAfterSecondInitialisation, webhooks, 'Expected webhooks to be unchanged');
        await knexInstance.destroy();
    });
    it('Can handle a misconfigured webhook', async function () {
        const knexInstance = await getKnexInstance();
        await addOwnerUser(knexInstance);
        await addActivityPubIntegration(knexInstance);
        const siteUrl = new URL('http://fake-site-url');
        const scope = (0, nock_1.default)(siteUrl)
            .get('/.ghost/activitypub/v1/site/')
            .matchHeader('authorization', 'Bearer token:owner@user.com:Owner')
            .reply(200, {
            webhook_secret: 'webhook_secret_baby!!'
        });
        const logging = console;
        const identityTokenService = {
            getTokenForUser(email, role) {
                return `token:${email}:${role}`;
            }
        };
        const service = new activity_pub_service_1.ActivityPubService(knexInstance, siteUrl, logging, identityTokenService);
        await service.initialiseWebhooks();
        (0, strict_1.default)(scope.isDone(), 'Expected the ActivityPub site endpoint to be called');
        const webhooks = await knexInstance.select('*').from('webhooks');
        const expectedWebhookCount = 4;
        const expectedWebhookSecret = 'webhook_secret_baby!!';
        const expectedWebhookIntegrationId = 'integration_id';
        strict_1.default.equal(webhooks.length, expectedWebhookCount);
        for (const webhook of webhooks) {
            strict_1.default.equal(webhook.secret, expectedWebhookSecret);
            strict_1.default.equal(webhook.integration_id, expectedWebhookIntegrationId);
        }
        await knexInstance('webhooks').update({ event: 'wrong.event' }).limit(1);
        (0, nock_1.default)(siteUrl)
            .get('/.ghost/activitypub/v1/site/')
            .matchHeader('authorization', 'Bearer token:owner@user.com:Owner')
            .reply(200, {
            webhook_secret: 'webhook_secret_baby!!'
        });
        await service.initialiseWebhooks();
        const webhooksAfterSecondInitialisation = await knexInstance.select('*').from('webhooks');
        strict_1.default.equal(webhooksAfterSecondInitialisation.length, expectedWebhookCount);
        for (const webhook of webhooksAfterSecondInitialisation) {
            strict_1.default.equal(webhook.secret, expectedWebhookSecret);
            strict_1.default.equal(webhook.integration_id, expectedWebhookIntegrationId);
        }
        strict_1.default.notDeepEqual(webhooksAfterSecondInitialisation, webhooks, 'Expected webhooks to be changed');
        await knexInstance.destroy();
    });
    it('Can handle missing integration without erroring', async function () {
        const knexInstance = await getKnexInstance();
        await addOwnerUser(knexInstance);
        const siteUrl = new URL('http://fake-site-url');
        const scope = (0, nock_1.default)(siteUrl)
            .get('/.ghost/activitypub/v1/site/')
            .matchHeader('authorization', 'Bearer token:owner@user.com:Owner')
            .reply(200, {
            webhook_secret: 'webhook_secret_baby!!'
        });
        const logging = console;
        const identityTokenService = {
            getTokenForUser(email, role) {
                return `token:${email}:${role}`;
            }
        };
        const service = new activity_pub_service_1.ActivityPubService(knexInstance, siteUrl, logging, identityTokenService);
        await service.initialiseWebhooks();
        (0, strict_1.default)(!scope.isDone(), 'Expected the ActivityPub site endpoint not to be called');
        await knexInstance.destroy();
    });
    it('Can handle errors getting the webhook secret without erroring', async function () {
        const knexInstance = await getKnexInstance();
        await addActivityPubIntegration(knexInstance);
        const siteUrl = new URL('http://fake-site-url');
        const logging = console;
        const identityTokenService = {
            getTokenForUser(email, role) {
                return `token:${email}:${role}`;
            }
        };
        const service = new activity_pub_service_1.ActivityPubService(knexInstance, siteUrl, logging, identityTokenService);
        await service.initialiseWebhooks();
        const webhooks = await knexInstance.select('*').from('webhooks');
        strict_1.default.equal(webhooks.length, 0, 'There should be no webhooks');
        await knexInstance.destroy();
    });
    it('Can disable the site', async function () {
        const knexInstance = await getKnexInstance();
        await addOwnerUser(knexInstance);
        await addActivityPubIntegration(knexInstance);
        const siteUrl = new URL('http://fake-site-url');
        const scope = (0, nock_1.default)(siteUrl)
            .delete('/.ghost/activitypub/v1/site/')
            .matchHeader('authorization', 'Bearer token:owner@user.com:Owner')
            .reply(200);
        const logging = console;
        const identityTokenService = {
            getTokenForUser(email, role) {
                return `token:${email}:${role}`;
            }
        };
        const service = new activity_pub_service_1.ActivityPubService(knexInstance, siteUrl, logging, identityTokenService);
        await service.disableSite();
        (0, strict_1.default)(scope.isDone(), 'Expected the ActivityPub site endpoint to be called');
        await knexInstance.destroy();
    });
});
