import { CreatePostDto } from 'src/resources/posts/dto/create-post.dto';

export const mockedPost: CreatePostDto = {
    userId: 1,
    companyId: 4,
    title: '',
    subtitle: '',
    createdAt: new Date(),
    text: '',
    likes: 0,
    image: '',
    likesOwners: '',
    avatar: '',
    id: 1,
};
