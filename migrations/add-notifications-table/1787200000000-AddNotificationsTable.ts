import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationsTable1787200000000 implements MigrationInterface {
    name = 'AddNotificationsTable1787200000000'

    public async up (queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "notifications" (
                "id" SERIAL NOT NULL,
                "userId" integer NOT NULL,
                "title" varchar(250) NOT NULL,
                "message" varchar(500) NOT NULL,
                "isRead" integer NOT NULL DEFAULT 0,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_notifications_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "notifications_userId_fk" ON "notifications" ("userId")`);
    }

    public async down (queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "notifications_userId_fk"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
    }
}
