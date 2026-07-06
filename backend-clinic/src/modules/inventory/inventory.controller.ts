import { Controller, Get, Post, Body } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto, CreateWarehouseDto, CreateStockMovementDto, CreateSupplierDto } from './dto/inventory.dto';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('items')
  findAllItems() {
    return this.inventoryService.findAllItems();
  }

  @Post('items')
  createItem(@Body() dto: CreateInventoryItemDto) {
    return this.inventoryService.createItem(dto);
  }

  @Get('warehouses')
  findAllWarehouses() {
    return this.inventoryService.findAllWarehouses();
  }

  @Post('warehouses')
  createWarehouse(@Body() dto: CreateWarehouseDto) {
    return this.inventoryService.createWarehouse(dto);
  }

  @Get('suppliers')
  findAllSuppliers() {
    return this.inventoryService.findAllSuppliers();
  }

  @Post('suppliers')
  createSupplier(@Body() dto: CreateSupplierDto) {
    return this.inventoryService.createSupplier(dto);
  }

  @Post('movements')
  createMovement(@Body() dto: CreateStockMovementDto) {
    return this.inventoryService.createMovement(dto);
  }

  @Get('summary')
  getSummary() {
    return this.inventoryService.getDashboardSummary();
  }
}
