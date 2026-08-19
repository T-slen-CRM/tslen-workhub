import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Index('messages_chatRoomId_timestamp_idx', ['chatRoomId', 'timestamp'])
@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
      id: string;

  @Column({ length: 255 })
      senderId: string; // Or a ManyToOne relation to a User entity

  @Column({ length: 255 })
      chatRoomId: string; // To differentiate between chat rooms/channels

  @Column('text')
      content: string;

  @CreateDateColumn()
      timestamp: Date;
}
