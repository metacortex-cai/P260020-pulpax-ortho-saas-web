import api from '../api';

export interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  category?: string;
  unit: string;
  criticalLevel: number;
  stocks?: any[];
  batches?: any[];
}

export interface Warehouse {
  id: string;
  name: string;
  description?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
}

export interface StockMovementPayload {
  itemId: string;
  type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT';
  quantity: number;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  supplierId?: string;
  batchNumber?: string;
  expiryDate?: string;
  reason?: string;
  note?: string;
}

export interface StockMovement {
  id: string;
  type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT';
  quantity: number;
  item?: { id: string; name: string; unit: string };
  fromWarehouse?: { id: string; name: string };
  toWarehouse?: { id: string; name: string };
  supplier?: { id: string; name: string };
  batchNumber?: string;
  note?: string;
  createdAt: string;
}

export interface InventoryFixture {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  serialNo?: string;
  category?: string;
  status: string;
  purchaseDate?: string;
  location?: string;
  value: number;
}

export const InventoryService = {
  async getItems(): Promise<InventoryItem[]> {
    const response = await api.get<InventoryItem[]>('/inventory/items');
    return response.data;
  },

  async createItem(data: Partial<InventoryItem>): Promise<InventoryItem> {
    const response = await api.post<InventoryItem>('/inventory/items', data);
    return response.data;
  },

  async getWarehouses(): Promise<Warehouse[]> {
    const response = await api.get<Warehouse[]>('/inventory/warehouses');
    return response.data;
  },

  async createWarehouse(data: Partial<Warehouse>): Promise<Warehouse> {
    const response = await api.post<Warehouse>('/inventory/warehouses', data);
    return response.data;
  },

  async getSuppliers(): Promise<Supplier[]> {
    const response = await api.get<Supplier[]>('/inventory/suppliers');
    return response.data;
  },

  async createSupplier(data: Partial<Supplier>): Promise<Supplier> {
    const response = await api.post<Supplier>('/inventory/suppliers', data);
    return response.data;
  },

  async getMovements(): Promise<StockMovement[]> {
    const response = await api.get<StockMovement[]>('/inventory/movements');
    return response.data;
  },

  async createMovement(data: StockMovementPayload): Promise<void> {
    await api.post('/inventory/movements', data);
  },

  async getDashboardSummary(): Promise<any[]> {
    const response = await api.get<any[]>('/inventory/summary');
    return response.data;
  },

  async getFixtures(): Promise<InventoryFixture[]> {
    const response = await api.get<InventoryFixture[]>('/inventory/fixtures');
    return response.data;
  },

  async createFixture(data: Partial<InventoryFixture>): Promise<InventoryFixture> {
    const response = await api.post<InventoryFixture>('/inventory/fixtures', data);
    return response.data;
  },

  async updateFixture(id: string, data: Partial<InventoryFixture>): Promise<InventoryFixture> {
    const response = await api.patch<InventoryFixture>(`/inventory/fixtures/${id}`, data);
    return response.data;
  }
};
