import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, } from 'typeorm';
import { Users } from '../../users/entities/users.entity';
import { InventoryByUserHistory } from '../../inventory/entities/inventory-by-user-history.entity';

@Index('inventory_users_id_fk', ['userId'], {})
@Entity("inventory")

export class Inventory  {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
      id: number;

  @Column("varchar", { name: "name", length: 255 })
      name: string;

  @Column("int", { name: "userId", nullable: true })
      userId: number | null;

  @Column("text", { name: "description", nullable: true })
      description: string | null;

  @Column("varchar", { name: "serialNumber", nullable: true, length: 255 })
      serialNumber: string | null;

  @Column("varchar", { name: "category", nullable: true, length: 255 })
      category: string | null;

  @Column("varchar", { name: "location", nullable: true, length: 255 })
      location: string | null;

  @Column("varchar", { name: "department", nullable: true, length: 255 })
      department: string | null;

  @Column("varchar", { name: "subDivision", nullable: true, length: 255 })
      subDivision: string | null;

  @Column("varchar", { name: "price", nullable: true, length: 255 })
      price: string | null;

  @Column("date", { name: "warrantyDate", nullable: true })
      warrantyDate: string | null;

  @Column("varchar", { name: "code", nullable: true, length: 255 })
      code: string | null;

  @ManyToOne(() => Users, (users) => users.inventories, {
      onDelete: "NO ACTION",
      onUpdate: "NO ACTION",
      eager: true,
  })
  @JoinColumn([{ name: "userId", referencedColumnName: "id" }])
      user?: Users;

  @OneToMany(
      () => InventoryByUserHistory,
      (inventoryByUserHistory) => inventoryByUserHistory.inventory,{
          cascade: true,
          eager: true
      }
  )
      inventoryByUserHistory?: InventoryByUserHistory[];
}
