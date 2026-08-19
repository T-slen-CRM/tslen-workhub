import { BaseAbstractRepository } from '../../repositories/base/base.abstract.repository';
import { BaseInterfaceService } from './base.interface.service';
import { DeleteResult } from 'typeorm';
import { ErrorExceptionMethod, ErrorService, IThrowErrorObject } from '../error/error.service';

export abstract class BaseAbstractService<TEntity, TCreateDto = any, TUpdateDto = any> implements BaseInterfaceService {
    protected currentRepository: any;
    protected constructor (
      private readonly baseAbstractRepository: BaseAbstractRepository<TEntity>,
      protected readonly errorService: ErrorService
    ) { }

    async findOneByCondition (options: any): Promise<TEntity> {
        try {
            return this.baseAbstractRepository.findOneByCondition(options);
        } catch (e) {
            const errorMessage = `findOneByCondition: ${JSON.stringify(options)}, class: ${this.constructor.name}. Message: ${e.message}`;
            const throwError: IThrowErrorObject = { method: ErrorExceptionMethod.NotFound, message: `Cannot find the entity for - ${JSON.stringify(options)}` };
            await this.errorService.aggregateError(
                errorMessage,
                errorMessage,
                throwError
            )
        }
    }

    async create (data: TCreateDto, user: any = null): Promise<TEntity> {
        try {
            if ('createOneWithRelations' in this.currentRepository) {
                return this.currentRepository.createOneWithRelations(data, user);
            } else {
                return this.baseAbstractRepository.create(data as any);
            }
        } catch (e) {
            const errorMessage = `create. Class: ${this.constructor.name} Message: ${e.message}`;
            const throwError: IThrowErrorObject = { method: ErrorExceptionMethod.NotFound, message: `Cannot create the entity.` };
            await this.errorService.aggregateError(
                errorMessage,
                errorMessage,
                throwError
            )
        }
    }

    async delete (id: number): Promise<DeleteResult> {
        const entity: TEntity = await this.baseAbstractRepository.findOne(id);
        if (!entity) {
            const errorMessage = `delete. Class: ${this.constructor.name} Message: Cannot find an entity for ${id}`;
            const throwError: IThrowErrorObject = { method: ErrorExceptionMethod.NotFound, message: `Cannot find an entity for ${id}` };
            await this.errorService.aggregateError(
                errorMessage,
                errorMessage,
                throwError
            )
        }
        try {
            if ('deleteOneWithRelations' in this.currentRepository) {
                return this.currentRepository.deleteOneWithRelations(id, entity);
            }
            else {
                return this.baseAbstractRepository.delete(id);
            }
        } catch (e) {
            const errorMessage = `delete. Class: ${this.constructor.name} Message: ${e.message}`;
            const throwError: IThrowErrorObject = { method: ErrorExceptionMethod.NotFound, message: `Cannot delete the entity.` };
            await this.errorService.aggregateError(
                errorMessage,
                errorMessage,
                throwError
            )
        }
    }

    async findAll (user: any): Promise<TEntity[]> {
        try {
            if ('getByRole' in this.currentRepository) {
                return this.currentRepository.getByRole(user);
            }
            else {
                return this.baseAbstractRepository.findAll();
            }
        } catch (e) {
            const errorMessage = `findAll. Class: ${this.constructor.name} Message: ${e.message}`;
            const throwError: IThrowErrorObject = { method: ErrorExceptionMethod.NotFound, message: `Cannot find the entities.` };
            await this.errorService.aggregateError(
                errorMessage,
                errorMessage,
                throwError
            )
        }
    }

    async findOneById (id: number, user: any): Promise<TEntity> {
        try {
            let result: TEntity;
            if ('getOneWithRelations' in this.currentRepository) {
                result = await this.currentRepository.getOneWithRelations(id, user);
            }
            else {
                result = await this.baseAbstractRepository.findOne(id);
            }
            return result;
        } catch (e) {
            const errorMessage = `findOneById: ${id}. Class: ${this.constructor.name} Message: ${e.message}`;
            const throwError: IThrowErrorObject = { method: ErrorExceptionMethod.NotFound, message: `Cannot find the entity for ${id}` };
            await this.errorService.aggregateError(
                errorMessage,
                errorMessage,
                throwError
            )
        }
    }

    async update (id: number, data: TUpdateDto): Promise<TEntity> {
        const entity: TEntity = await this.baseAbstractRepository.findOne(id);
        if (!entity) {
            const errorMessage = `update. Class: ${this.constructor.name} Message: Cannot find an entity for ${id}`;
            const throwError: IThrowErrorObject = { method: ErrorExceptionMethod.NotFound, message: `Cannot find an entity for ${id}` };
            await this.errorService.aggregateError(
                errorMessage,
                errorMessage,
                throwError
            )
        }
        const entityData: TEntity = Object.assign(entity, data);
        try {
            if ('updateOneWithRelations' in this.currentRepository) {
                return this.currentRepository.updateOneWithRelations(entityData);
            }
            else {
                return this.baseAbstractRepository.save(entityData);
            }
        } catch (e) {
            const errorMessage = `update. Class: ${this.constructor.name} Message: ${e.message}`;
            const throwError: IThrowErrorObject = { method: ErrorExceptionMethod.NotFound, message: `Cannot update the entity.` };
            await this.errorService.aggregateError(
                errorMessage,
                errorMessage,
                throwError
            )
        }
    }
}
