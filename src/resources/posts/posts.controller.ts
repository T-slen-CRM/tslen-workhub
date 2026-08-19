import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, ParseFilePipe, MaxFileSizeValidator } from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { User } from '../users/decorators/user.decorator';
import { Users } from '../users/entities/users.entity';
import { Posts } from './entities/post.entity';
import { DeleteResult } from 'typeorm';
import { Roles } from '../../common/guards/roles/roles.decorator';
import { Role } from '../../common/guards/roles/role.enum';
import { diskStorage } from 'multer';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileExtensionValidatorPipe } from '../users/pipes/file-extension-validator.pipe';

@Controller('posts')
export class PostsController {
    constructor (private readonly postsService: PostsService) {}

    @Post('/post-image')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: './upload/posts',
                filename: (req, file, cb) => {
                    const ext = path.extname(file.originalname);
                    const filename = `${uuidv4()}${ext}`;
                    cb(null, filename);
                },
            }),
        }),
    )
    uploadImage (@UploadedFile(
        new ParseFilePipe({ validators: [new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 })] }), // 2MB
        new FileExtensionValidatorPipe())
        file: Express.Multer.File) {
        return this.postsService.addImage(file);
    }

  @Post()
  @Roles(Role.Admin, Role.Manager)
    create (@Body() createPostDto: CreatePostDto): Promise<Posts> {
        return this.postsService.create(createPostDto);
    }
  @Get()
  findAll (@User() user: Users): Promise<Posts[]> {
      return this.postsService.findAll(user);
  }
  @Patch(':id')
  update (@Param('id', ParseIntPipe) id: number,
          @Body() updatePostDto: UpdatePostDto
  ): Promise<Posts> {
      return this.postsService.update(+id, updatePostDto);
  }

  @Delete(':id')
  @Roles(Role.Admin, Role.Manager)
  remove (@Param('id', ParseIntPipe) id: number): Promise<DeleteResult> {
      return this.postsService.delete(+id);
  }
}
