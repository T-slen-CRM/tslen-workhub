import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CronsRepository{
    constructor (
      private readonly entityManager: EntityManager,
    ) {
    }
    async find (entity: any, options = {}): Promise<any[]> {
        return this.entityManager.find(entity, options);
    }
    async update (entity: any, options = {}, data: any): Promise<any> {
        return this.entityManager.update(entity, options, data);
    }
    async save (entity: any): Promise<any> {
        return this.entityManager.save(entity);
    }
    async findOne (entity: any, options = {}): Promise<any> {
        return this.entityManager.findOne(entity, options);
    }
    async delete (entity: any, options = {}): Promise<any> {
        return this.entityManager.delete(entity, options);
    }
}
