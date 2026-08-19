import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMessagesChatRoomIndex1786965846242 implements MigrationInterface {
    name = 'AddMessagesChatRoomIndex1786965846242'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "messages_chatRoomId_timestamp_idx" ON "messages" ("chatRoomId", "timestamp")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "messages_chatRoomId_timestamp_idx"`);
    }

}
