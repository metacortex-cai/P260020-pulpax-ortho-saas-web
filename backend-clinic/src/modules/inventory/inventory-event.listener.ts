import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TreatmentCompletedEvent, EVENTS } from '../../common/events/domain-events';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';

@Injectable()
export class InventoryEventListener {
  private readonly logger = new Logger(InventoryEventListener.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  @OnEvent(EVENTS.TREATMENT_COMPLETED, { async: true })
  async handleTreatmentCompleted(event: TreatmentCompletedEvent): Promise<void> {
    try {
      const prisma = await this.tenantPrisma.getClient();
      
      // 1. Get treatment item detail
      const treatmentItem = await prisma.treatmentItem.findUnique({
        where: { id: event.treatmentItemId },
        include: { tariff: { include: { masterTreatment: true } } }
      });

      if (!treatmentItem) {
        this.logger.warn(`TreatmentItem not found: ${event.treatmentItemId}`);
        return;
      }

      const treatmentName = treatmentItem.tariff.masterTreatment.name.toLowerCase();
      this.logger.log(`Handling stock consumption for treatment: "${treatmentName}" in clinic ${event.clinicId}`);

      // 2. Define recipes
      let recipes: { itemName: string; qty: number }[] = [];
      if (treatmentName.includes('dolgu')) {
        recipes = [
          { itemName: 'Kompozit Dolgu Tüpü', qty: 1 },
          { itemName: 'Anestezi Ampulü', qty: 1 }
        ];
      } else if (treatmentName.includes('implant')) {
        recipes = [
          { itemName: 'İmplant Vidası', qty: 1 },
          { itemName: 'Anestezi Ampulü', qty: 1 }
        ];
      } else if (treatmentName.includes('kanal')) {
        recipes = [
          { itemName: 'Kanal Patı', qty: 1 },
          { itemName: 'Anestezi Ampulü', qty: 1 }
        ];
      } else if (treatmentName.includes('çekim') || treatmentName.includes('cekim')) {
        recipes = [
          { itemName: 'Anestezi Ampulü', qty: 1 },
          { itemName: 'Steril Gazlı Bez', qty: 1 }
        ];
      }

      if (recipes.length === 0) {
        this.logger.log(`No stock recipes mapped for treatment: "${treatmentName}". Skipping.`);
        return;
      }

      // 3. Find first warehouse or create a default one
      let warehouse = await prisma.warehouse.findFirst({
        where: { clinicId: event.clinicId, isActive: true }
      });

      if (!warehouse) {
        warehouse = await prisma.warehouse.create({
          data: {
            name: 'Merkez Depo',
            description: 'Varsayılan Klinik Deposu',
            clinicId: event.clinicId,
            isActive: true
          }
        });
      }

      // 4. Deduct stock for each recipe item
      for (const recipe of recipes) {
        // Find or create item
        let item = await prisma.inventoryItem.findFirst({
          where: { name: recipe.itemName, clinicId: event.clinicId }
        });

        if (!item) {
          item = await prisma.inventoryItem.create({
            data: {
              name: recipe.itemName,
              clinicId: event.clinicId,
              unit: 'ADET',
              criticalLevel: 2,
              isActive: true
            }
          });
        }

        // Find or create stock record in the warehouse
        let stock = await prisma.inventoryStock.findUnique({
          where: {
            warehouseId_itemId: {
              warehouseId: warehouse.id,
              itemId: item.id
            }
          }
        });

        if (!stock) {
          // Seed initial stock of 10 items to prevent failure
          stock = await prisma.inventoryStock.create({
            data: {
              clinicId: event.clinicId,
              itemId: item.id,
              warehouseId: warehouse.id,
              quantity: 10
            }
          });
        }

        const currentQty = Number(stock.quantity);
        const newQty = currentQty - recipe.qty;
        const finalQty = newQty >= 0 ? newQty : 0;

        // Perform updates inside a transaction
        await prisma.$transaction(async (tx) => {
          // Update Stock
          await tx.inventoryStock.update({
            where: { id: stock.id },
            data: { quantity: finalQty }
          });

          // Create OUT Movement
          await tx.stockMovement.create({
            data: {
              clinicId: event.clinicId,
              itemId: item.id,
              type: 'OUT',
              quantity: recipe.qty,
              fromWarehouseId: warehouse.id,
              reason: `Otomatik Tedavi Sarfı (${treatmentItem.tariff.masterTreatment.name})`,
              userId: event.employeeId
            }
          });
        });

        this.logger.log(`Deducted ${recipe.qty} of "${recipe.itemName}" from warehouse "${warehouse.name}". Qty: ${currentQty} -> ${finalQty}`);

        // 5. Critical Stock Alert Trigger
        if (finalQty <= Number(item.criticalLevel)) {
          this.logger.warn(`Critical stock level reached for "${recipe.itemName}". Qty: ${finalQty}, Critical Level: ${item.criticalLevel}`);
          
          await prisma.notification.create({
            data: {
              clinicId: event.clinicId,
              type: 'WARNING',
              title: 'Kritik Stok Uyarısı',
              message: `"${recipe.itemName}" stok seviyesi kritik düzeyin altına düştü! Kalan: ${finalQty} ADET.`,
              link: '/inventory/status'
            }
          });
        }
      }

    } catch (err) {
      this.logger.error(`Stock consumption event handler failed: ${err.message}`, err.stack);
    }
  }
}
