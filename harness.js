const express = require('express');

const app = express();
app.use(express.json({limit: '5mb'}));
app.use(express.urlencoded({extended: true}));
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    next();
});

function sendText(res, status, body) {
    res.status(status);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    if (body === undefined || body === null) {
        return res.send('');
    }
    if (typeof body === 'string') {
        return res.send(body);
    }
    return res.send(JSON.stringify(body, null, 2));
}

function loadTarget(name, requirePath, factory) {
    try {
        const mod = require(requirePath);
        return {name, mod, instance: factory ? factory(mod) : null, ok: true};
    } catch (err) {
        console.warn(`[WARN] Failed to load ${name}: ${err.message}`);
        return {name, error: err, ok: false};
    }
}

function safeJson(value, fallback = {}) {
    if (value === undefined || value === null) return fallback;
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

const loaded = {
    oembed: loadTarget(
        'OEmbedService',
        './ghost/core/core/server/services/oembed/oembed-service',
        (Cls) => new Cls({
            config: {
                get: (key) => {
                    if (key === 'env') return process.env.NODE_ENV || 'development';
                    return undefined;
                },
                getContentPath: () => '/tmp'
            },
            storage: {
                getStorage: () => ({
                    getSanitizedFileName: (n) => String(n || 'file').replace(/[^a-zA-Z0-9._-]/g, '-'),
                    generateUnique: async (dir, name, ext) => `${dir}/${name}${ext || ''}`,
                    saveRaw: async (_buf, targetPath) => `https://storage.local/${targetPath}`
                })
            },
            externalRequest: Object.assign(
                async () => {
                    throw new Error('externalRequest stub not configured');
                },
                {
                    defaults: {options: {}}
                }
            )
        })
    ),
    media: loadTarget(
        'ExternalMediaInliner',
        './ghost/core/core/server/services/media-inliner/external-media-inliner',
        (Cls) => new Cls({
            PostModel: {},
            PostMetaModel: {},
            TagModel: {},
            UserModel: {},
            getMediaStorage: () => ({
                storagePath: '/tmp',
                getTargetDir: (p) => p,
                getUniqueFileName: async (_nameObj, targetDir) => `${targetDir}/stub.bin`,
                saveRaw: async (_buf, targetPath) => `https://storage.local/${targetPath}`
            })
        })
    ),
    redirects: loadTarget(
        'LinkRedirectsService',
        './ghost/core/core/server/services/link-redirection/link-redirects-service',
        (Cls) => new Cls({
            config: {baseURL: new URL('https://example.test/')},
            linkRedirectRepository: {
                getByURL: async (url) => {
                    const target = (url.searchParams.get('to') || 'https://example.com/');
                    return {
                        to: new URL(target),
                        from: url,
                        href: url.href
                    };
                },
                getAll: async () => [],
                getFilteredIds: async () => [],
                save: async () => {}
            }
        })
    ),
    announcement: loadTarget(
        'AnnouncementBarSettings',
        './ghost/core/core/server/services/announcement-bar-service/announcement-bar-settings',
        (Cls) => new Cls({
            getAnnouncementSettings: () => ({
                announcement: '<b>sample announcement</b>',
                announcement_visibility: ['visitors', 'free_members', 'paid_members'],
                announcement_background: '#ffffff'
            })
        })
    ),
    mentions: loadTarget(
        'MentionController',
        './ghost/core/core/server/services/mentions/mention-controller',
        (Cls) => new Cls()
    ),
    comments: loadTarget(
        'CommentsService',
        './ghost/core/core/server/services/comments/comments-service',
        (Cls) => new Cls({
            config: {},
            logging: console,
            models: {
                Comment: {
                    findOne: async () => ({id: 'comment1', get: () => null, toJSON: () => ({id: 'comment1'})}),
                    findPage: async () => ({data: [], meta: {pagination: {page: 1, limit: 15, pages: 0, total: 0}}}),
                    add: async (data) => ({id: 'comment-new', ...data, get: (k) => data[k], toJSON: () => data}),
                    edit: async (data, opts) => ({id: opts.id, ...data, get: (k) => data[k], toJSON: () => data}),
                    bulkEditWhere: async () => {}
                },
                CommentLike: {
                    findOne: async () => null,
                    findPage: async () => ({data: [], meta: {pagination: {page: 1, limit: 15, pages: 0, total: 0}}}),
                    add: async (data) => data,
                    destroy: async () => {},
                    NotFoundError: class NotFoundError extends Error {}
                },
                CommentReport: {
                    findOne: async () => null,
                    findPage: async () => ({data: [], meta: {pagination: {page: 1, limit: 15, pages: 0, total: 0}}}),
                    add: async (data) => data
                },
                Member: {
                    findOne: async () => ({id: 'member1', get: () => 'paid', toJSON: () => ({status: 'paid'})})
                },
                Post: {
                    findOne: async () => ({id: 'post1', toJSON: () => ({id: 'post1'})})
                }
            },
            mailer: {},
            settingsCache: {get: () => 'all'},
            settingsHelpers: {},
            urlService: {},
            urlUtils: {},
            contentGating: {
                BLOCK_ACCESS: 'BLOCK_ACCESS',
                checkPostAccess: () => 'ALLOW_ACCESS'
            },
            labs: {}
        })
    )
};

app.get('/health', (req, res) => {
    sendText(res, 200, 'ok');
});

app.post('/harness/oembedservice-fetchoembeddatafromurl', async (req, res) => {
    try {
        if (!loaded.oembed.ok) return sendText(res, 500, `OEmbedService failed to load: ${loaded.oembed.error.message}`);
        const {url, type, options} = req.body || {};
        const result = await loaded.oembed.instance.fetchOembedDataFromUrl(url, type, safeJson(options, {}));
        return sendText(res, 200, result);
    } catch (err) {
        return sendText(res, 500, err && err.message ? err.message : String(err));
    }
});

app.post('/harness/externalmediainliner-getremotemedia', async (req, res) => {
    try {
        if (!loaded.media.ok) return sendText(res, 500, `ExternalMediaInliner failed to load: ${loaded.media.error.message}`);
        const {requestURL} = req.body || {};
        const result = await loaded.media.instance.getRemoteMedia(requestURL);
        return sendText(res, 200, result);
    } catch (err) {
        return sendText(res, 500, err && err.message ? err.message : String(err));
    }
});

app.get('/harness/linkredirectsservice-handlerequest', async (req, res) => {
    try {
        if (!loaded.redirects.ok) return sendText(res, 500, `LinkRedirectsService failed to load: ${loaded.redirects.error.message}`);
        const stubReq = {
            originalUrl: req.originalUrl.replace(/^\/harness\/linkredirectsservice-handlerequest/, '') || '/',
            query: req.query
        };
        const stubRes = {
            setHeader: (k, v) => res.setHeader(k, v),
            redirect: (location) => sendText(res, 200, location)
        };
        const next = (err) => {
            if (err) return sendText(res, 500, err.message || String(err));
            return sendText(res, 200, 'next()');
        };
        await loaded.redirects.instance.handleRequest(stubReq, stubRes, next);
    } catch (err) {
        return sendText(res, 500, err && err.message ? err.message : String(err));
    }
});

app.get('/harness/announcementbarsettings-getannouncementsettings', async (req, res) => {
    try {
        if (!loaded.announcement.ok) return sendText(res, 500, `AnnouncementBarSettings failed to load: ${loaded.announcement.error.message}`);
        const member = safeJson(req.query.member, undefined);
        const result = loaded.announcement.instance.getAnnouncementSettings(member);
        return sendText(res, 200, result);
    } catch (err) {
        return sendText(res, 500, err && err.message ? err.message : String(err));
    }
});

app.post('/harness/mentioncontroller-receive', async (req, res) => {
    try {
        if (!loaded.mentions.ok) return sendText(res, 500, `MentionController failed to load: ${loaded.mentions.error.message}`);
        const frame = safeJson(req.body.frame, req.body || {});
        loaded.mentions.instance['#jobService'] = loaded.mentions.instance['#jobService'] || {addJob: (_n, fn) => fn()};
        await loaded.mentions.instance.init({
            api: {
                processWebmention: async () => {},
                listMentions: async () => ({data: [], meta: {}})
            },
            jobService: {addJob: (_name, fn) => fn()},
            mentionResourceService: {getByID: async () => ({id: 'resource1'})}
        });
        await loaded.mentions.instance.receive(frame);
        return sendText(res, 200, 'ok');
    } catch (err) {
        return sendText(res, 500, err && err.message ? err.message : String(err));
    }
});

app.post('/harness/oembedservice-fetchbookmarkdata', async (req, res) => {
    try {
        if (!loaded.oembed.ok) return sendText(res, 500, `OEmbedService failed to load: ${loaded.oembed.error.message}`);
        const {url, html, type} = req.body || {};
        const result = await loaded.oembed.instance.fetchBookmarkData(url, html, type);
        return sendText(res, 200, result);
    } catch (err) {
        return sendText(res, 500, err && err.message ? err.message : String(err));
    }
});

app.get('/harness/commentsservice-getcommentreporters', async (req, res) => {
    try {
        if (!loaded.comments.ok) return sendText(res, 500, `CommentsService failed to load: ${loaded.comments.error.message}`);
        const {commentId} = req.query;
        const options = safeJson(req.query.options, {});
        const result = await loaded.comments.instance.getCommentReporters(commentId, options);
        return sendText(res, 200, result);
    } catch (err) {
        return sendText(res, 500, err && err.message ? err.message : String(err));
    }
});

app.get('/harness/commentsservice-getcommentlikes', async (req, res) => {
    try {
        if (!loaded.comments.ok) return sendText(res, 500, `CommentsService failed to load: ${loaded.comments.error.message}`);
        const {commentId} = req.query;
        const options = safeJson(req.query.options, {});
        const result = await loaded.comments.instance.getCommentLikes(commentId, options);
        return sendText(res, 200, result);
    } catch (err) {
        return sendText(res, 500, err && err.message ? err.message : String(err));
    }
});

const port = parseInt(process.env.PORT || '3001', 10);
app.listen(port, () => {
    console.log(`Harness server listening on ${port}`);
});
