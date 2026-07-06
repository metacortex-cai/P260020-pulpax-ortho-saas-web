import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { IBaseRepository, FindOptions } from './base-repository.interface';

export abstract class TenantBaseRepository<T, CreateDto, UpdateDto> implements IBaseRepository<T, CreateDto, UpdateDto> {
  constructor(
    protected readonly tenantPrisma: TenantPrismaService,
    protected readonly modelName: string,
  ) {}

  /**
   * Prisma model delegate'ine dinamik ve izole erişim sağlar.
   */
  protected async getDelegate(): Promise<any> {
    const client = await this.tenantPrisma.getClient();
    return (client as any)[this.modelName];
  }

  async findById(id: string): Promise<T | null> {
    const delegate = await this.getDelegate();
    return delegate.findUnique({ where: { id } });
  }

  async findAll(opts: FindOptions<T> = {}): Promise<[T[], number]> {
    const delegate = await this.getDelegate();
    const data = await delegate.findMany({
      where: opts.where,
      include: opts.include,
      orderBy: opts.orderBy,
      take: opts.take,
      skip: opts.skip,
    });
    const count = await delegate.count({ where: opts.where });
    return [data, count];
  }

  async save(data: CreateDto): Promise<T> {
    const delegate = await this.getDelegate();
    return delegate.create({ data });
  }

  async update(id: string, data: UpdateDto): Promise<T> {
    const delegate = await this.getDelegate();
    return delegate.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string, statusField: string = 'status', deletedValue: any = 'DELETED'): Promise<T> {
    const delegate = await this.getDelegate();
    return delegate.update({
      where: { id },
      data: { [statusField]: deletedValue },
    });
  }

  async delete(id: string): Promise<T> {
    const delegate = await this.getDelegate();
    return delegate.delete({ where: { id } });
  }
}
