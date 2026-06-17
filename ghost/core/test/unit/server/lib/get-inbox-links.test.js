"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const dns = __importStar(require("node:dns/promises"));
const lodash_es_1 = require("lodash-es");
const get_inbox_links_1 = require("../../../../core/server/lib/get-inbox-links");
describe('getInboxLinks', function () {
    const resolverThatShouldNeverBeUsed = {
        resolveMx: () => {
            strict_1.default.fail('This DNS test resolver should never be used');
        }
    };
    it('returns undefined for invalid recipient emails', async function () {
        const emails = [
            '',
            'foo',
            'example.com'
        ];
        for (const email of emails) {
            strict_1.default.equal(await (0, get_inbox_links_1.getInboxLinks)({
                recipient: email,
                sender: 'ignored@example.com',
                dnsResolver: resolverThatShouldNeverBeUsed
            }), undefined);
        }
    });
    it('handles Google emails', async function () {
        const emails = [
            'example@gmail.com',
            'example@googlemail.com',
            'example@google.com'
        ];
        await Promise.all(emails.map(async (recipient) => {
            const result = await (0, get_inbox_links_1.getInboxLinks)({
                recipient,
                sender: 'sender@example.com',
                dnsResolver: resolverThatShouldNeverBeUsed
            });
            strict_1.default.equal(result?.provider, 'gmail');
            (0, strict_1.default)(result?.desktop.startsWith('https://mail.google.com/mail/u/0/'));
            (0, strict_1.default)(result?.desktop.includes(`authuser=${encodeURIComponent(recipient)}`));
            (0, strict_1.default)(result?.desktop.includes(encodeURIComponent('sender@example.com')));
            (0, strict_1.default)(result?.android.startsWith('intent:'));
            (0, strict_1.default)(result?.android.includes('com.google.android.gm'));
            (0, strict_1.default)(result?.android.includes('browser_fallback_url'));
        }));
        const nonAsciiResult = await (0, get_inbox_links_1.getInboxLinks)({
            recipient: 'examplé@gmail.com',
            sender: 'sendér@example.com',
            dnsResolver: resolverThatShouldNeverBeUsed
        });
        (0, strict_1.default)(nonAsciiResult?.desktop.includes(`authuser=${encodeURIComponent('examplé@gmail.com')}`));
        (0, strict_1.default)(nonAsciiResult?.desktop.includes(encodeURIComponent('sendér@example.com')));
    });
    it('handles Yahoo emails', async function () {
        const emails = [
            'example@yahoo.com',
            'example@myyahoo.com',
            'example@yahoo.co.uk',
            'example@yahoo.fr',
            'example@yahoo.it',
            'example@ymail.com',
            'example@rocketmail.com'
        ];
        await Promise.all(emails.map(async (recipient) => {
            const result = await (0, get_inbox_links_1.getInboxLinks)({
                recipient,
                sender: 'sender@example.com',
                dnsResolver: resolverThatShouldNeverBeUsed
            });
            strict_1.default.equal(result?.provider, 'yahoo');
            (0, strict_1.default)(result?.desktop.startsWith('https://mail.yahoo.com/d/search/keyword=from:'));
            (0, strict_1.default)(result?.desktop.includes(encodeURIComponent('sender@example.com')));
            (0, strict_1.default)(result?.android.startsWith('intent:'));
            (0, strict_1.default)(result?.android.includes('com.yahoo.mobile.client.android.mail'));
            (0, strict_1.default)(result?.android.includes('browser_fallback_url'));
        }));
    });
    it('handles Microsoft emails', async function () {
        const emails = [
            'example@outlook.com',
            'example@live.com',
            'example@live.de',
            'example@hotmail.com',
            'example@hotmail.co.uk',
            'example@hotmail.de',
            'example@msn.com'
        ];
        await Promise.all(emails.map(async (recipient) => {
            const result = await (0, get_inbox_links_1.getInboxLinks)({
                recipient,
                sender: 'sender@example.com',
                dnsResolver: resolverThatShouldNeverBeUsed
            });
            strict_1.default.equal(result?.provider, 'outlook');
            strict_1.default.equal(result?.desktop, `https://outlook.live.com/mail/?login_hint=${encodeURIComponent(recipient)}`);
            (0, strict_1.default)(result?.android.startsWith('intent:'));
            (0, strict_1.default)(result?.android.includes('com.microsoft.office.outlook'));
            (0, strict_1.default)(result?.android.includes('browser_fallback_url'));
        }));
    });
    it('handles Proton emails', async function () {
        const emails = [
            'example@proton.me',
            'example@pm.me',
            'example@protonmail.com'
        ];
        await Promise.all(emails.map(async (recipient) => {
            const result = await (0, get_inbox_links_1.getInboxLinks)({
                recipient,
                sender: 'sender@example.com',
                dnsResolver: resolverThatShouldNeverBeUsed
            });
            strict_1.default.equal(result?.provider, 'proton');
            (0, strict_1.default)(result?.desktop.startsWith('https://mail.proton.me/'));
            (0, strict_1.default)(result?.desktop.includes(encodeURIComponent('sender@example.com')));
            (0, strict_1.default)(result?.android.startsWith('intent:'));
            (0, strict_1.default)(result?.android.includes('ch.protonmail.android'));
            (0, strict_1.default)(result?.android.includes('browser_fallback_url'));
        }));
    });
    it('handles iCloud emails', async function () {
        const emails = [
            'example@icloud.com',
            'example@me.com',
            'example@mac.com'
        ];
        await Promise.all(emails.map(async (recipient) => {
            const result = await (0, get_inbox_links_1.getInboxLinks)({
                recipient,
                sender: 'sender@example.com',
                dnsResolver: resolverThatShouldNeverBeUsed
            });
            strict_1.default.equal(result?.provider, 'icloud');
            strict_1.default.equal(result?.desktop, 'https://www.icloud.com/mail');
            strict_1.default.equal(result?.android, 'https://www.icloud.com/mail');
        }));
    });
    it('handles Hey emails', async function () {
        const result = await (0, get_inbox_links_1.getInboxLinks)({
            recipient: 'example@hey.com',
            sender: 'sender@example.com',
            dnsResolver: resolverThatShouldNeverBeUsed
        });
        strict_1.default.equal(result?.provider, 'hey');
        strict_1.default.equal(result?.desktop, 'https://app.hey.com/topics/everything');
        (0, strict_1.default)(result?.android.startsWith('intent:'));
        (0, strict_1.default)(result?.android.includes('com.basecamp.hey'));
        (0, strict_1.default)(result?.android.includes('browser_fallback_url'));
    });
    it('handles AOL emails', async function () {
        const result = await (0, get_inbox_links_1.getInboxLinks)({
            recipient: 'example@aol.com',
            sender: 'sender@example.com',
            dnsResolver: resolverThatShouldNeverBeUsed
        });
        strict_1.default.equal(result?.provider, 'aol');
        (0, strict_1.default)(result?.desktop.startsWith('https://mail.aol.com/'));
        (0, strict_1.default)(result?.desktop.includes(encodeURIComponent('sender@example.com')));
        (0, strict_1.default)(result?.android.startsWith('intent:'));
        (0, strict_1.default)(result?.android.includes('com.aol.mobile.aolapp'));
        (0, strict_1.default)(result?.android.includes('browser_fallback_url'));
    });
    it('handles Mail.ru emails', async function () {
        const result = await (0, get_inbox_links_1.getInboxLinks)({
            recipient: 'example@mail.ru',
            sender: 'sender@example.com',
            dnsResolver: resolverThatShouldNeverBeUsed
        });
        strict_1.default.equal(result?.provider, 'mailru');
        (0, strict_1.default)(result?.desktop.startsWith('https://e.mail.ru/search/'));
        (0, strict_1.default)(result?.desktop.includes(encodeURIComponent('sender@example.com')));
        (0, strict_1.default)(result?.android.startsWith('intent:'));
        (0, strict_1.default)(result?.android.includes('ru.mail.mailapp'));
        (0, strict_1.default)(result?.android.includes('browser_fallback_url'));
    });
    it('handles Feedbin emails', async function () {
        const result = await (0, get_inbox_links_1.getInboxLinks)({
            recipient: 'example@feedb.in',
            sender: 'sender@example.com',
            dnsResolver: resolverThatShouldNeverBeUsed
        });
        strict_1.default.equal(result?.provider, 'feedbin');
        strict_1.default.equal(result?.desktop, 'https://feedbin.com/');
        strict_1.default.equal(result?.android, 'https://feedbin.com/');
    });
    describe('DNS lookups', function () {
        it('returns undefined if the MX resolution fails for any reason', async function () {
            const errors = [
                new Error('Unexpected error'),
                Object.assign(new Error(), { code: dns.TIMEOUT }),
                Object.assign(new Error(), { code: dns.NODATA })
            ];
            await Promise.all(errors.map(async (error) => {
                const resolver = {
                    resolveMx: () => Promise.reject(error)
                };
                const result = await (0, get_inbox_links_1.getInboxLinks)({
                    recipient: 'recipient@example.com',
                    sender: 'sender@example.com',
                    dnsResolver: resolver
                });
                strict_1.default.equal(result, undefined);
            }));
        });
        it('returns undefined if the MX resolution returns a null MX record', async function () {
            const resolver = {
                resolveMx: async () => [
                    { priority: 0, exchange: '' }
                ]
            };
            const result = await (0, get_inbox_links_1.getInboxLinks)({
                recipient: 'recipient@example.com',
                sender: 'sender@example.com',
                dnsResolver: resolver
            });
            strict_1.default.equal(result, undefined);
        });
        it('returns undefined if no MX exchanges are recognized', async function () {
            const resolver = {
                resolveMx: async () => (0, lodash_es_1.shuffle)([
                    { priority: 1, exchange: 'one.example' },
                    { priority: 2, exchange: 'two.example' },
                    { priority: 3, exchange: 'three.example' },
                    { priority: 4, exchange: 'google.com.example' }
                ])
            };
            const result = await (0, get_inbox_links_1.getInboxLinks)({
                recipient: 'recipient@example.com',
                sender: 'sender@example.com',
                dnsResolver: resolver
            });
            strict_1.default.equal(result, undefined);
        });
        it('returns undefined if the first recognized MX exchange has the same priority as one that is not recognized, just in case', async function () {
            const resolver = {
                resolveMx: async () => (0, lodash_es_1.shuffle)([
                    { priority: 1, exchange: 'ignored.example' },
                    { priority: 2, exchange: 'gmail.com' },
                    { priority: 2, exchange: 'unknown.example' }
                ])
            };
            const result = await (0, get_inbox_links_1.getInboxLinks)({
                recipient: 'recipient@example.com',
                sender: 'sender@example.com',
                dnsResolver: resolver
            });
            strict_1.default.equal(result, undefined);
        });
        it('returns undefined if two exchanges with the same priority are both recognized, just in case', async function () {
            const resolver = {
                resolveMx: async () => (0, lodash_es_1.shuffle)([
                    { priority: 1, exchange: 'ignored.example' },
                    { priority: 2, exchange: 'gmail.com' },
                    { priority: 2, exchange: 'protonmail.ch' }
                ])
            };
            const result = await (0, get_inbox_links_1.getInboxLinks)({
                recipient: 'recipient@example.com',
                sender: 'sender@example.com',
                dnsResolver: resolver
            });
            strict_1.default.equal(result, undefined);
        });
        it('returns the first recognized provider if a top-level domain', async function () {
            const resolver = {
                resolveMx: async () => (0, lodash_es_1.shuffle)([
                    { priority: 1, exchange: 'ignored.example' },
                    { priority: 2, exchange: 'gmail.com' },
                    { priority: 3, exchange: 'yahoo.com' }
                ])
            };
            const result = await (0, get_inbox_links_1.getInboxLinks)({
                recipient: 'recipient@example.com',
                sender: 'sender@example.com',
                dnsResolver: resolver
            });
            (0, strict_1.default)(result?.desktop.includes('mail.google.com'));
        });
        it('returns the first recognized provider if a subdomain', async function () {
            const resolver = {
                resolveMx: async () => (0, lodash_es_1.shuffle)([
                    { priority: 1, exchange: 'ignored.example' },
                    { priority: 2, exchange: 'aspmx.l.google.com' },
                    { priority: 3, exchange: 'mail.protonmail.ch' }
                ])
            };
            const result = await (0, get_inbox_links_1.getInboxLinks)({
                recipient: 'recipient@example.com',
                sender: 'sender@example.com',
                dnsResolver: resolver
            });
            (0, strict_1.default)(result?.desktop.includes('mail.google.com'));
        });
        it('handles two exchanges with the same priority but the same provider', async function () {
            const resolver = {
                resolveMx: async () => (0, lodash_es_1.shuffle)([
                    { priority: 1, exchange: 'ignored.example' },
                    { priority: 2, exchange: 'aspmx.l.google.com' },
                    { priority: 2, exchange: 'aspmx2.googlemail.com' },
                    { priority: 3, exchange: 'mail.protonmail.ch' }
                ])
            };
            const result = await (0, get_inbox_links_1.getInboxLinks)({
                recipient: 'recipient@example.com',
                sender: 'sender@example.com',
                dnsResolver: resolver
            });
            (0, strict_1.default)(result?.desktop.includes('mail.google.com'));
        });
    });
});
