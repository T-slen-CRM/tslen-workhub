import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTaskCommentsTable1786973000000 implements MigrationInterface {
    name = 'AddTaskCommentsTable1786973000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "taskComments" (
                "id" SERIAL NOT NULL,
                "taskId" integer,
                "userId" integer,
                "content" text NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_taskComments_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_taskComments_taskId" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_taskComments_userId" FOREIGN KEY ("userId") REFERENCES "users"("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX "taskComments_tasks_id_fk" ON "taskComments" ("taskId")`);
        await queryRunner.query(`CREATE INDEX "taskComments_users_id_fk" ON "taskComments" ("userId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "taskComments_users_id_fk"`);
        await queryRunner.query(`DROP INDEX "taskComments_tasks_id_fk"`);
        await queryRunner.query(`DROP TABLE "taskComments"`);
    }
}
