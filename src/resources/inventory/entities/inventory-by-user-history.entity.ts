import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, } from 'typeorm';
import { Users } from '../../users/entities/users.entity';
import { Inventory } from './inventory.entity';

@Index('inventory_by_user_history_inventory_id_fk', ['inventoryId'], {})
@Index("inventoryByUserHistory_users_id_fk", ["userId"], {})
@Entity("inventoryByUserHistory")
export class InventoryByUserHistory {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
      id?: number;

  @Column("int", { name: "inventoryId" })
      inventoryId: number;

  @Column("int", { name: "userId" })
      userId: number;

  @Column("date", {
      name: "startDate",
      nullable: false
  })
      startDate: Date;

  @Column("date", { name: "endDate", nullable: true })
      endDate: Date | null;

  @ManyToOne(() => Inventory, (inventory) => inventory.inventoryByUserHistory, {
      onDelete: "NO ACTION",
      onUpdate: "NO ACTION",
  })
  @JoinColumn([{ name: "inventoryId", referencedColumnName: "id" }])
      inventory?: Inventory;

  @ManyToOne(() => Users, (users) => users.inventoryByUserHistory, {
      onDelete: "NO ACTION",
      onUpdate: "NO ACTION",
      eager: true,
  })
  @JoinColumn([{ name: "userId", referencedColumnName: "id" }])
      user?: Users;
}
