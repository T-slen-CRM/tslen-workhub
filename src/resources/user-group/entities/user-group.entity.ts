import {
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
} from "typeorm";
import { UserRelationToGroup } from '../../users/entities/user-relation-to-group.entity';
import { Company } from '../../company/entities/company.entity';

@Index("usersGroup_companies_null_fk", ["companyId"], {})
@Entity("usersGroup")
export class UserGroup {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
      id: number;

  @Column("varchar", { name: "name", nullable: true, length: 250 })
      name: string | null;

  @Column("timestamp", { name: "createdAt", nullable: true })
      createdAt: Date | null;

  @Column("varchar", { name: "permissions", nullable: true, length: 250 })
      permissions: string | null;

  @Column("int", { name: "companyId", nullable: true })
      companyId: number | null;

  @OneToMany(
      () => UserRelationToGroup,
      (userRelationToGroup) => userRelationToGroup.groupId
  )
      userRelationToGroups: UserRelationToGroup[];

  @ManyToOne(() => Company, (company) => company.id, {
      onDelete: "NO ACTION",
      onUpdate: "NO ACTION",
  })
  @JoinColumn([{ name: "companyId", referencedColumnName: "id" }])
      company: Company;
}
