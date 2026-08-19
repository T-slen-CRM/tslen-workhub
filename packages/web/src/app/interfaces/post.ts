export interface IPost {
    avatar: string;
    createdAt: string | Date;
    id?: number;
    image?: string;
    likes: number;
    likesOwners: string;
    subtitle: string | Date;
    text: string;
    title: string;
    userId: number;
    companyId: number
}
