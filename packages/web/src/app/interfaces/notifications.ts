export interface Notification {
    id: number;
    title: string;
    message: string;
    time?: string;
    isRead: number;
    userId?: number;
    createdAt?: Date;
    link?: string;
}
export interface Notifications extends Array<Notification>{}
