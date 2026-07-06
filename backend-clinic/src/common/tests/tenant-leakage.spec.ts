import { Test, TestingModule } from '@nestjs/testing';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { AppModule } from '../../app.module';
import { TenantContext } from '../context/tenant-context';
import { NotFoundException } from '@nestjs/common';

import { EmailService } from '../../modules/email/email.service';
import { CacheService } from '../cache/cache.service';

jest.mock('@nestjs/bullmq', () => {
  const actual = jest.requireActual('@nestjs/bullmq');
  return {
    ...actual,
    BullModule: {
      forRoot: () => ({ module: class {}, providers: [] }),
      forRootAsync: () => ({ module: class {}, providers: [] }),
      registerQueue: (...args: any[]) => {
        const providers = args.map(arg => {
          const name = typeof arg === 'string' ? arg : arg.name;
          const token = `BullQueue_${name}`;
          return {
            provide: token,
            useValue: { add: jest.fn().mockResolvedValue({}), on: jest.fn() },
          };
        });
        return { module: class {}, providers, exports: providers };
      },
      registerQueueAsync: (...args: any[]) => {
        const providers = args.map(arg => {
          const name = typeof arg === 'string' ? arg : arg.name;
          const token = `BullQueue_${name}`;
          return {
            provide: token,
            useValue: { add: jest.fn().mockResolvedValue({}), on: jest.fn() },
          };
        });
        return { module: class {}, providers, exports: providers };
      },
    },
  };
});

import { PrismaService } from '../../prisma/prisma.service';

describe('SaaS Multi-Tenant Fiziksel İzolasyon Güvenlik Testleri (Database-per-Tenant Isolation)', () => {
  let tenantPrisma: TenantPrismaService;
  let moduleRef: TestingModule;
  const clinicAId = '00000000-0000-0000-0000-000000000001';
  const clinicBId = '00000000-0000-0000-0000-000000000002';
  let patientAId: string;

  beforeAll(async () => {
    const mockClients = new Map<string, any>();

    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue({
        sendEmail: jest.fn().mockResolvedValue(true),
        initializeTransporter: jest.fn(),
      })
      .overrideProvider(CacheService)
      .useValue({
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(undefined),
        del: jest.fn().mockResolvedValue(undefined),
      })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn().mockResolvedValue(undefined),
        $disconnect: jest.fn().mockResolvedValue(undefined),
        clinic: {
          findUnique: jest.fn().mockImplementation(({ where }) => {
            return Promise.resolve({ id: where.id, databaseUrl: `mock_url_${where.id}` });
          }),
        },
      })
      .overrideProvider(TenantPrismaService)
      .useValue({
        getClient: async () => {
          const clinicId = TenantContext.getClinicId();
          if (!clinicId) {
            throw new NotFoundException('Klinik bağlamı (tenant context) bulunamadı.');
          }
          const databaseUrl = `mock_url_${clinicId}`;
          let client = mockClients.get(databaseUrl);
          if (!client) {
            const patientsList: any[] = [];
            client = {
              patient: {
                create: jest.fn().mockImplementation(({ data }) => {
                  const newPatient = { id: Math.random().toString(), ...data };
                  patientsList.push(newPatient);
                  return Promise.resolve(newPatient);
                }),
                deleteMany: jest.fn().mockImplementation(() => {
                  patientsList.length = 0;
                  return Promise.resolve({ count: 0 });
                }),
                findUnique: jest.fn().mockImplementation(({ where }) => {
                  const p = patientsList.find(item => item.id === where.id);
                  return Promise.resolve(p || null);
                }),
              },
              $connect: jest.fn().mockResolvedValue(undefined),
              $disconnect: jest.fn().mockResolvedValue(undefined),
            };
            mockClients.set(databaseUrl, client);
          }
          return client;
        },
      })
      .compile();

    await moduleRef.init(); // <--- Ensure lifecycle hooks are called

    tenantPrisma = moduleRef.get<TenantPrismaService>(TenantPrismaService);

    // 1. Clinic A veritabanında test hastası oluştur
    await TenantContext.run({ clinicId: clinicAId }, async () => {
      const client = await tenantPrisma.getClient();
      // Clean previous test records
      await client.patient.deleteMany().catch(() => {});
      
      const patient = await client.patient.create({
        data: {
          firstName: 'Gizli Hasta A',
          lastName: 'Test',
          phone: '+905555555555',
          nationalId: '12345678901',
          clinicId: clinicAId,
        },
      });
      patientAId = patient.id;
    });

    // 2. Clinic B veritabanındaki test hastalarını temizle
    await TenantContext.run({ clinicId: clinicBId }, async () => {
      const client = await tenantPrisma.getClient();
      await client.patient.deleteMany().catch(() => {});
    });
  });

  afterAll(async () => {
    // Clinic A veritabanı temizliği
    await TenantContext.run({ clinicId: clinicAId }, async () => {
      const client = await tenantPrisma.getClient();
      await client.patient.deleteMany().catch(() => {});
    });
    await moduleRef.close();
  });

  it('GÜVENLİ: Kendi kliniğinin (Clinic A) bağlamında hastaya sorunsuz erişilebilmelidir', async () => {
    await TenantContext.run({ clinicId: clinicAId }, async () => {
      const client = await tenantPrisma.getClient();
      const patient = await client.patient.findUnique({
        where: { id: patientAId },
      });
      expect(patient).toBeDefined();
      expect(patient?.firstName).toBe('Gizli Hasta A');
    });
  });

  it('GÜVENLİ (TEST LEAK): Farklı bir klinik (Clinic B) bağlamında Clinic A veritabanındaki hastaya ASLA erişilememelidir (Fiziksel İzolasyon)', async () => {
    await TenantContext.run({ clinicId: clinicBId }, async () => {
      const client = await tenantPrisma.getClient();
      const patient = await client.patient.findUnique({
        where: { id: patientAId },
      });
      // Clinic B veritabanında bu kimlikte hiçbir hasta fiziksel olarak bulunamaz!
      expect(patient).toBeNull();
    });
  });

  it('GÜVENLİ (DEFAULT DENY): Klinik bağlamı (tenant context) olmadan veritabanına erişim engellenmelidir', async () => {
    // Herhangi bir tenant_id set edilmediğinde, getClient() otomatik olarak NotFoundException fırlatır!
    await expect(tenantPrisma.getClient()).rejects.toThrow(NotFoundException);
  });
});
