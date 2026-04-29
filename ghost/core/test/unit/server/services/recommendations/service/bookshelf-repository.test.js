"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nql_1 = __importDefault(require("@tryghost/nql"));
const strict_1 = __importDefault(require("assert/strict"));
const bookshelf_repository_1 = require("../../../../../../core/server/services/recommendations/service/bookshelf-repository");
class SimpleBookshelfRepository extends bookshelf_repository_1.BookshelfRepository {
    modelToEntity(model) {
        return {
            id: model.id,
            deleted: false,
            name: model.get('name'),
            age: model.get('age'),
            birthday: model.get('birthday')
        };
    }
    toPrimitive(entity) {
        return {
            id: entity.id,
            name: entity.name,
            age: entity.age,
            birthday: entity.birthday
        };
    }
    getFieldToColumnMap() {
        return {
            id: 'id',
            deleted: 'deleted',
            name: 'name',
            age: 'age',
            birthday: 'birthday'
        };
    }
}
class Model {
    items = [];
    orderRaw;
    limit;
    offset;
    returnCount = false;
    constructor() {
        this.items = [];
    }
    destroy(data) {
        this.items = this.items.filter(item => item.id !== data.id);
        return Promise.resolve();
    }
    findOne(data, options) {
        const item = this.items.find(i => i.id === data.id);
        if (!item && options?.require) {
            throw new Error('Not found');
        }
        return Promise.resolve(item ?? null);
    }
    fetchAll() {
        const sorted = this.items.slice().sort((a, b) => {
            for (const order of this.orderRaw?.split(',') ?? []) {
                const [field, direction] = order.split(' ');
                const aValue = a.get(field);
                const bValue = b.get(field);
                if (aValue < bValue) {
                    return direction === 'asc' ? -1 : 1;
                }
                else if (aValue > bValue) {
                    return direction === 'asc' ? 1 : -1;
                }
            }
            return 0;
        });
        return Promise.resolve(sorted.slice(this.offset ?? 0, (this.offset ?? 0) + (this.limit ?? sorted.length)));
    }
    add(data) {
        const item = {
            id: data.id,
            ...data,
            get(field) {
                return data[field];
            },
            set(d, value) {
                if (typeof d === 'string') {
                    data[d] = value;
                }
                else {
                    Object.assign(data, d);
                }
            },
            save(properties) {
                Object.assign(data, properties);
                return Promise.resolve(item);
            }
        };
        this.items.push(item);
        return Promise.resolve(item);
    }
    getFilteredCollection({ filter, mongoTransformer }) {
        // Filter all items by filter and mongoTransformer
        if (!filter) {
            return this;
        }
        const n = (0, nql_1.default)(filter, {
            transformer: mongoTransformer
        });
        const duplicate = new Model();
        duplicate.items = this.items.filter(item => n.queryJSON(item));
        return duplicate;
    }
    count() {
        return Promise.resolve(this.items.length);
    }
    // eslint-disable-next-line no-unused-vars
    query(f) {
        const builder = {
            limit: (limit) => {
                this.limit = limit;
                return builder;
            },
            offset: (offset) => {
                this.offset = offset;
                return builder;
            },
            orderByRaw: (order) => {
                this.orderRaw = order;
                return builder;
            },
            select: () => {
                return builder;
            },
            count: () => {
                return builder;
            },
            groupBy: (field) => {
                return Promise.resolve([
                    {
                        [field]: 5,
                        count: 5
                    }
                ]);
            }
        };
        if (f) {
            f(builder);
        }
        return builder;
    }
}
describe('BookshelfRepository', function () {
    it('Can save, retrieve, update and delete entities', async function () {
        const repository = new SimpleBookshelfRepository(new Model());
        checkRetrieving: {
            const entity = {
                id: '1',
                deleted: false,
                name: 'John',
                age: 30,
                birthday: new Date('2000-01-01').toISOString()
            };
            await repository.save(entity);
            const result = await repository.getById('1');
            (0, strict_1.default)(result);
            (0, strict_1.default)(result.name === 'John');
            (0, strict_1.default)(result.age === 30);
            (0, strict_1.default)(result.id === '1');
            break checkRetrieving;
        }
        checkUpdating: {
            const entity = {
                id: '2',
                deleted: false,
                name: 'John',
                age: 24,
                birthday: new Date('2000-01-01').toISOString()
            };
            await repository.save(entity);
            entity.name = 'Kym';
            await repository.save(entity);
            const result = await repository.getById('2');
            (0, strict_1.default)(result);
            strict_1.default.equal(result.name, 'Kym');
            strict_1.default.equal(result.age, 24);
            strict_1.default.equal(result.id, '2');
            break checkUpdating;
        }
        checkDeleting: {
            const entity = {
                id: '3',
                deleted: false,
                name: 'Egg',
                age: 180,
                birthday: new Date('2010-01-01').toISOString()
            };
            await repository.save(entity);
            (0, strict_1.default)(await repository.getById('3'));
            entity.deleted = true;
            await repository.save(entity);
            (0, strict_1.default)(!await repository.getById('3'));
            break checkDeleting;
        }
    });
    it('Can save and retrieve all entities', async function () {
        const repository = new SimpleBookshelfRepository(new Model());
        const entities = [{
                id: '1',
                deleted: false,
                name: 'Kym',
                age: 24,
                birthday: new Date('2000-01-01').toISOString()
            }, {
                id: '2',
                deleted: false,
                name: 'John',
                age: 30,
                birthday: new Date('2000-01-01').toISOString()
            }, {
                id: '3',
                deleted: false,
                name: 'Kevin',
                age: 5,
                birthday: new Date('2000-01-01').toISOString()
            }];
        for (const entity of entities) {
            await repository.save(entity);
        }
        const result = await repository.getAll({
            order: [{
                    field: 'age',
                    direction: 'desc'
                }]
        });
        (0, strict_1.default)(result);
        (0, strict_1.default)(result.length === 3);
        (0, strict_1.default)(result[0].age === 30);
        (0, strict_1.default)(result[1].age === 24);
        (0, strict_1.default)(result[2].age === 5);
    });
    it('Can retrieve page', async function () {
        const repository = new SimpleBookshelfRepository(new Model());
        const entities = [{
                id: '1',
                deleted: false,
                name: 'Kym',
                age: 24,
                birthday: new Date('2000-01-01').toISOString()
            }, {
                id: '2',
                deleted: false,
                name: 'John',
                age: 30,
                birthday: new Date('2000-01-01').toISOString()
            }, {
                id: '3',
                deleted: false,
                name: 'Kevin',
                age: 5,
                birthday: new Date('2000-01-01').toISOString()
            }];
        for (const entity of entities) {
            await repository.save(entity);
        }
        const result = await repository.getPage({
            order: [{
                    field: 'age',
                    direction: 'desc'
                }],
            limit: 5,
            page: 1
        });
        (0, strict_1.default)(result);
        (0, strict_1.default)(result.length === 3);
        (0, strict_1.default)(result[0].age === 30);
        (0, strict_1.default)(result[1].age === 24);
        (0, strict_1.default)(result[2].age === 5);
    });
    it('Can retrieve page without order', async function () {
        const repository = new SimpleBookshelfRepository(new Model());
        const entities = [{
                id: '1',
                deleted: false,
                name: 'Kym',
                age: 24,
                birthday: new Date('2000-01-01').toISOString()
            }, {
                id: '2',
                deleted: false,
                name: 'John',
                age: 30,
                birthday: new Date('2000-01-01').toISOString()
            }, {
                id: '3',
                deleted: false,
                name: 'Kevin',
                age: 5,
                birthday: new Date('2000-01-01').toISOString()
            }];
        for (const entity of entities) {
            await repository.save(entity);
        }
        const result = await repository.getPage({
            order: [],
            limit: 5,
            page: 1
        });
        (0, strict_1.default)(result);
        (0, strict_1.default)(result.length === 3);
    });
    it('Cannot retrieve zero page number', async function () {
        const repository = new SimpleBookshelfRepository(new Model());
        const entities = [{
                id: '1',
                deleted: false,
                name: 'Kym',
                age: 24,
                birthday: new Date('2000-01-01').toISOString()
            }, {
                id: '2',
                deleted: false,
                name: 'John',
                age: 30,
                birthday: new Date('2000-01-01').toISOString()
            }, {
                id: '3',
                deleted: false,
                name: 'Kevin',
                age: 5,
                birthday: new Date('2000-01-01').toISOString()
            }];
        for (const entity of entities) {
            await repository.save(entity);
        }
        const result = repository.getPage({
            order: [],
            limit: 5,
            page: 0
        });
        await strict_1.default.rejects(result, /page/);
    });
    it('Cannot retrieve zero limit', async function () {
        const repository = new SimpleBookshelfRepository(new Model());
        const entities = [{
                id: '1',
                deleted: false,
                name: 'Kym',
                age: 24,
                birthday: new Date('2000-01-01').toISOString()
            }, {
                id: '2',
                deleted: false,
                name: 'John',
                age: 30,
                birthday: new Date('2000-01-01').toISOString()
            }, {
                id: '3',
                deleted: false,
                name: 'Kevin',
                age: 5,
                birthday: new Date('2000-01-01').toISOString()
            }];
        for (const entity of entities) {
            await repository.save(entity);
        }
        const result = repository.getPage({
            order: [],
            limit: 0,
            page: 5
        });
        await strict_1.default.rejects(result, /limit/);
    });
    it('Can retrieve count', async function () {
        const repository = new SimpleBookshelfRepository(new Model());
        const entities = [{
                id: '1',
                deleted: false,
                name: 'Kym',
                age: 24,
                birthday: new Date('2000-01-01').toISOString()
            }, {
                id: '2',
                deleted: false,
                name: 'John',
                age: 30,
                birthday: new Date('2000-01-01').toISOString()
            }, {
                id: '3',
                deleted: false,
                name: 'Kevin',
                age: 5,
                birthday: new Date('2000-01-01').toISOString()
            }];
        for (const entity of entities) {
            await repository.save(entity);
        }
        const result = await repository.getCount({});
        (0, strict_1.default)(result === 3);
    });
    it('Can retrieve grouped count', async function () {
        const repository = new SimpleBookshelfRepository(new Model());
        const entities = [{
                id: '1',
                deleted: false,
                name: 'Kym',
                age: 24,
                birthday: new Date('2000-01-01').toISOString()
            }, {
                id: '2',
                deleted: false,
                name: 'John',
                age: 30,
                birthday: new Date('2000-01-01').toISOString()
            }, {
                id: '3',
                deleted: false,
                name: 'Kevin',
                age: 5,
                birthday: new Date('2000-01-01').toISOString()
            }];
        for (const entity of entities) {
            await repository.save(entity);
        }
        const result = await repository.getGroupedCount({ groupBy: 'age' });
        (0, strict_1.default)(result.length === 1);
        (0, strict_1.default)(result[0].age === 5);
        (0, strict_1.default)(result[0].count === 5);
    });
});
