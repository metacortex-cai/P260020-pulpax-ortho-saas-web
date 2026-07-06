export interface FindOptions<T> {
  where?: Partial<T> | Record<string, any>;
  include?: any;
  orderBy?: any;
  take?: number;
  skip?: number;
}

export interface IBaseRepository<T, CreateDto, UpdateDto> {
  findById(id: string): Promise<T | null>;
  findAll(opts?: FindOptions<T>): Promise<[T[], number]>;
  save(data: CreateDto): Promise<T>;
  update(id: string, data: UpdateDto): Promise<T>;
  softDelete(id: string, statusField?: string, deletedValue?: string | boolean): Promise<T>;
  delete(id: string): Promise<T>;
}
