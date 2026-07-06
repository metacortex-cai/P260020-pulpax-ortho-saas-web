import { PrismaService } from '../../prisma/prisma.service';
import { IBaseRepository, FindOptions } from './base-repository.interface';

export abstract class BaseRepository<T, CreateDto, UpdateDto> implements IBaseRepository<T, CreateDto, UpdateDto> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly modelName: string,
  ) {}

  /**
   * Prisma dökümantasyonundaki delegate objesine dinamik erişim sağlar.
   */
  protected get delegate(): any {
    return (this.prisma as any)[this.modelName];
  }

  async findById(id: string): Promise<T | null> {
    return this.delegate.findUnique({ where: { id } });
  }

  async findAll(opts: FindOptions<T> = {}): Promise<[T[], number]> {
    const data = await this.delegate.findMany({
      where: opts.where,
      include: opts.include,
      orderBy: opts.orderBy,
      take: opts.take,
      skip: opts.skip,
    });
    const count = await this.delegate.count({ where: opts.where });
    return [data, count];
  }

  async save(data: CreateDto): Promise<T> {
    return this.delegate.create({ data });
  }

  async update(id: string, data: UpdateDto): Promise<T> {
    return this.delegate.update({
      where: { id },
      data,
    });
  }

  /**
   * LLD: "Soft Delete: Hicbir tablo fiziksel DELETE almaz" kuralının ortak uygulaması.
   * Model'e göre status field ve value değişebilir (örn: isActive: false, status: 'PASSIVE').
   */
  async softDelete(id: string, statusField: string = 'status', deletedValue: any = 'DELETED'): Promise<T> {
    return this.delegate.update({
      where: { id },
      data: { [statusField]: deletedValue },
    });
  }

  /**
   * İstisnai durumlarda fiziksel silme (Kullanılmamalıdır, genelde soft delete önerilir).
   */
  async delete(id: string): Promise<T> {
    return this.delegate.delete({ where: { id } });
  }
}
