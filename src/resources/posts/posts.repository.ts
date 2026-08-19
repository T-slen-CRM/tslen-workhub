import { BaseAbstractRepository } from '../../common/repositories/base/base.abstract.repository';
import { Posts } from './entities/post.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from '../users/entities/users.entity';

export class PostsRepository extends BaseAbstractRepository<Posts>{
    constructor (
    @InjectRepository(Posts)
    private readonly postsRepository: Repository<Posts>
    ) {
        super(postsRepository);
    }
    getByRole (user: Users): Promise<Posts[]> {
        // order by ascending
        return this.postsRepository.find({
            where: {
                companyId: user.companyId
            },
            order: {
                createdAt: 'DESC'
            }
        })
    }
}
