import { AsyncLocalStorage } from 'async_hooks';

export interface TenantStore {
  clinicId?: string;
  userId?: string;
}

export class TenantContext {
  private static readonly storage = new AsyncLocalStorage<TenantStore>();

  static run<T>(store: TenantStore, callback: () => T): T {
    return this.storage.run(store, callback);
  }

  static getClinicId(): string | undefined {
    return this.storage.getStore()?.clinicId;
  }

  static getUserId(): string | undefined {
    return this.storage.getStore()?.userId;
  }
}
