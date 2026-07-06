import { Injectable, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { TenantContext } from '../../common/context/tenant-context';
import { CreateInventoryItemDto, CreateWarehouseDto, CreateStockMovementDto, CreateSupplierDto } from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async findAllItems() {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.inventoryItem.findMany({
      include: { 
        stocks: { include: { warehouse: true } },
        batches: { where: { quantity: { gt: 0 } } }
      },
      orderBy: { name: 'asc' }
    });
  }

  async createItem(dto: CreateInventoryItemDto) {
    const prisma = await this.tenantPrisma.getClient();
    const clinicId = TenantContext.getClinicId();
    return prisma.inventoryItem.create({ 
      data: { ...dto, clinicId: clinicId! } 
    });
  }

  async findAllWarehouses() {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.warehouse.findMany({ where: { isActive: true } });
  }

  async createWarehouse(dto: CreateWarehouseDto) {
    const prisma = await this.tenantPrisma.getClient();
    const clinicId = TenantContext.getClinicId();
    return prisma.warehouse.create({ 
      data: { ...dto, clinicId: clinicId! } 
    });
  }

  async findAllSuppliers() {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.supplier.findMany({ where: { isActive: true } });
  }

  async createSupplier(dto: CreateSupplierDto) {
    const prisma = await this.tenantPrisma.getClient();
    const clinicId = TenantContext.getClinicId();
    return prisma.supplier.create({
      data: { ...dto, clinicId: clinicId! }
    });
  }

  /**
   * Stok hareketi kaydeder, InventoryStock ve InventoryBatch tablolarını günceller.
   */
  async createMovement(dto: CreateStockMovementDto) {
    const prisma = await this.tenantPrisma.getClient();
    const clinicId = TenantContext.getClinicId();
    const userId = TenantContext.getUserId();

    return prisma.$transaction(async (tx) => {
      // 1. Hareketi kaydet
      const movement = await tx.stockMovement.create({
        data: {
          ...dto,
          clinicId: clinicId!,
          userId,
        }
      });

      // 2. Stok seviyelerini güncelle (Genel ve Batch bazlı)
      if (dto.type === 'IN' || dto.type === 'ADJUSTMENT') {
        if (!dto.toWarehouseId) throw new BadRequestException('Hedef depo seçilmelidir.');
        await this.updateStockAndBatch(tx, dto, dto.toWarehouseId, 'ADD', clinicId!);
      } 
      else if (dto.type === 'OUT') {
        if (!dto.fromWarehouseId) throw new BadRequestException('Kaynak depo seçilmelidir.');
        await this.updateStockAndBatch(tx, dto, dto.fromWarehouseId, 'SUBTRACT', clinicId!);
      }
      else if (dto.type === 'TRANSFER') {
        if (!dto.fromWarehouseId || !dto.toWarehouseId) throw new BadRequestException('Kaynak ve hedef depo seçilmelidir.');
        await this.updateStockAndBatch(tx, dto, dto.fromWarehouseId, 'SUBTRACT', clinicId!);
        await this.updateStockAndBatch(tx, dto, dto.toWarehouseId, 'ADD', clinicId!);
      }

      return movement;
    });
  }

  private async updateStockAndBatch(tx: any, dto: CreateStockMovementDto, warehouseId: string, operation: 'ADD' | 'SUBTRACT', clinicId: string) {
    // 1. Genel Stok Güncelleme
    const currentStock = await tx.inventoryStock.findUnique({
      where: { warehouseId_itemId: { warehouseId, itemId: dto.itemId } }
    });

    if (!currentStock && operation === 'SUBTRACT') {
      throw new BadRequestException('Yetersiz stok: Kaynak depoda ürün bulunamadı.');
    }

    if (!currentStock) {
      await tx.inventoryStock.create({
        data: { itemId: dto.itemId, warehouseId, quantity: dto.quantity, clinicId }
      });
    } else {
      const newQuantity = operation === 'ADD' 
        ? Number(currentStock.quantity) + dto.quantity 
        : Number(currentStock.quantity) - dto.quantity;

      if (newQuantity < 0) throw new BadRequestException('Yetersiz stok bakiyesi.');

      await tx.inventoryStock.update({
        where: { id: currentStock.id },
        data: { quantity: newQuantity }
      });
    }

    // 2. Batch (Parti) Güncelleme (Opsiyonel ama önerilen)
    if (dto.batchNumber) {
      const currentBatch = await tx.inventoryBatch.findFirst({
        where: { 
          itemId: dto.itemId, 
          warehouseId, 
          batchNumber: dto.batchNumber,
          clinicId
        }
      });

      if (!currentBatch && operation === 'SUBTRACT') {
        // Not: Bazı durumlarda batch zorunlu olmayabilir, ama girildiyse kontrol etmeliyiz.
        throw new BadRequestException(`Belirtilen batch (${dto.batchNumber}) bu depoda bulunamadı.`);
      }

      if (!currentBatch) {
        await tx.inventoryBatch.create({
          data: {
            itemId: dto.itemId,
            warehouseId,
            batchNumber: dto.batchNumber,
            expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
            quantity: dto.quantity,
            clinicId
          }
        });
      } else {
        const newBatchQty = operation === 'ADD'
          ? Number(currentBatch.quantity) + dto.quantity
          : Number(currentBatch.quantity) - dto.quantity;
        
        if (newBatchQty < 0) throw new BadRequestException(`Batch (${dto.batchNumber}) bakiyesi yetersiz.`);

        await tx.inventoryBatch.update({
          where: { id: currentBatch.id },
          data: { quantity: newBatchQty }
        });
      }
    }
  }

  async getDashboardSummary() {
    const prisma = await this.tenantPrisma.getClient();
    const items = await prisma.inventoryItem.findMany({
      include: { stocks: true }
    });

    return items.map(item => {
      const totalQuantity = item.stocks.reduce((sum, s) => sum + Number(s.quantity), 0);
      return {
        id: item.id,
        name: item.name,
        totalQuantity,
        isCritical: totalQuantity <= Number(item.criticalLevel),
        unit: item.unit
      };
    });
  }
}
