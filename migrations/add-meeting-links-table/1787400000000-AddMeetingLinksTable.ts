import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMeetingLinksTable1787400000000 implements MigrationInterface {
    name = 'AddMeetingLinksTable1787400000000'

    public async up (queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "meetingLinks" (
                "id" SERIAL NOT NULL,
                "token" varchar(64) NOT NULL,
                "encryptedToken" varchar(255) NOT NULL,
                "roomName" varchar(100) NOT NULL,
                "hostUserId" integer NOT NULL,
                "title" varchar(250),
                "expiresAt" TIMESTAMP,
                "revokedAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_meetingLinks_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_meetingLinks_token" UNIQUE ("token"),
                CONSTRAINT "UQ_meetingLinks_roomName" UNIQUE ("roomName"),
                CONSTRAINT "FK_meetingLinks_hostUserId" FOREIGN KEY ("hostUserId") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "meetingLinks_hostUserId_fk" ON "meetingLinks" ("hostUserId")`);
    }

    public async down (queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "meetingLinks_hostUserId_fk"`);
        await queryRunner.query(`DROP TABLE "meetingLinks"`);
    }
}
