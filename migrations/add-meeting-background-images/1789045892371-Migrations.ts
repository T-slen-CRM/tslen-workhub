import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1789045892371 implements MigrationInterface {
    name = 'Migrations1789045892371'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "meetingBackgroundImages" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "url" character varying(1100) NOT NULL, "originName" character varying(255) NOT NULL, "type" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_meetingBackgroundImages_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "meetingBackgroundImages_userId_fk" ON "meetingBackgroundImages" ("userId") `);
        await queryRunner.query(`ALTER TABLE "meetingBackgroundImages" ADD CONSTRAINT "FK_meetingBackgroundImages_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "meetingBackgroundImages" DROP CONSTRAINT "FK_meetingBackgroundImages_userId"`);
        await queryRunner.query(`DROP INDEX "public"."meetingBackgroundImages_userId_fk"`);
        await queryRunner.query(`DROP TABLE "meetingBackgroundImages"`);
    }

}
