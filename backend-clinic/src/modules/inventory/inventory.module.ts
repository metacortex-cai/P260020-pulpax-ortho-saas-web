import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { InventoryEventListener } from './inventory-event.listener';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, InventoryEventListener],
  exports: [InventoryService],
})
export class InventoryModule {}
