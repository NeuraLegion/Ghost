"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("assert/strict"));
const in_memory_repository_1 = require("../../../../../core/server/services/lib/in-memory-repository");
class SimpleInMemoryRepository extends in_memory_repository_1.InMemoryRepository {
    constructor() {
        super();
    }
    toPrimitive(entity) {
        return {
            name: entity.name,
            age: entity.age,
            birthday: entity.birthday
        };
    }
}
describe('InMemoryRepository', function () {
    it('Can save, retrieve, update and delete entities', async function () {
        const repository = new SimpleInMemoryRepository();
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
            (0, strict_1.default)(result.name === 'Kym');
            (0, strict_1.default)(result.age === 24);
            (0, strict_1.default)(result.id === '2');
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
        const repository = new SimpleInMemoryRepository();
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
    it('Can save and retrieve a filtered page of entities', async function () {
        const repository = new SimpleInMemoryRepository();
        const entities = [
            {
                id: '3',
                deleted: false,
                name: 'Egg',
                age: 180,
                birthday: new Date('2010-01-01').toISOString()
            }, {
                id: '1',
                deleted: false,
                name: 'John',
                age: 30,
                birthday: new Date('2000-01-01').toISOString()
            }, {
                id: '2',
                deleted: false,
                name: 'Kym',
                age: 24,
                birthday: new Date('2000-01-01').toISOString()
            }, {
                id: '4',
                deleted: false,
                name: 'Kevin',
                age: 36,
                birthday: new Date('2010-01-01').toISOString()
            }
        ];
        for (const entity of entities) {
            await repository.save(entity);
        }
        const result = await repository.getPage({
            filter: 'age:>25',
            page: 1,
            limit: 3,
            order: [{
                    field: 'age',
                    direction: 'asc'
                }]
        });
        const count = await repository.getCount({
            filter: 'name:John'
        });
        (0, strict_1.default)(result);
        (0, strict_1.default)(result.length === 3);
        (0, strict_1.default)(count === 1);
        const resultBirthdayFilter = await repository.getPage({
            filter: 'birthday:>2005-01-01T00:00:00.000Z',
            page: 1,
            limit: 3,
            order: [{
                    field: 'age',
                    direction: 'asc'
                }]
        });
        (0, strict_1.default)(resultBirthdayFilter);
        strict_1.default.equal(resultBirthdayFilter.length, 2);
        strict_1.default.equal(resultBirthdayFilter[0].name, 'Kevin');
        strict_1.default.equal(resultBirthdayFilter[1].name, 'Egg');
    });
});
