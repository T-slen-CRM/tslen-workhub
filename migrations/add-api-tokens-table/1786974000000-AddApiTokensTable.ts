import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApiTokensTable1786974000000 implements MigrationInterface {
    name = 'AddApiTokensTable1786974000000'

    public async up (queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "apiTokens" (
                "id" SERIAL NOT NULL,
                "token" varchar(64) NOT NULL,
                "userId" integer NOT NULL,
                "name" varchar(250) NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "lastUsedAt" TIMESTAMP,
                CONSTRAINT "PK_apiTokens_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_apiTokens_token" UNIQUE ("token"),
                CONSTRAINT "FK_apiTokens_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "apiTokens_users_id_fk" ON "apiTokens" ("userId")`);
    }

    public async down (queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "apiTokens_users_id_fk"`);
        await queryRunner.query(`DROP TABLE "apiTokens"`);
    }
}
