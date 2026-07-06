// ENCRYPTION_KEY must be set BEFORE AuthService (and its transitive import of
// EncryptionUtil) is loaded — EncryptionUtil throws at module-load time if the
// env var is missing. Because ts-jest compiles to CommonJS, statements written
// before an `import` in this file execute before that import's `require()`.
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-min-32-chars-long';

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { EncryptionUtil } from '../../common/utils/encryption.util';

const JWT_TEST_SECRET = 'test-jwt-secret-min-32-chars-long';

describe('AuthService (backend-saas)', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    userClinic: { findMany: jest.Mock };
  };
  let jwtService: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let emailService: { sendEmail: jest.Mock };

  const CLINIC_A_ID = 'clinic-aaa-111';
  const RAW_PASSWORD = 'CorrectHorseBatteryStaple1!';
  let hashedPassword: string;

  const buildUser = (overrides: Record<string, any> = {}) => ({
    id: 'user-1',
    clinicId: CLINIC_A_ID,
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: EncryptionUtil.encrypt('ada@example.com'),
    emailHash: EncryptionUtil.hashEmail('ada@example.com'),
    password: hashedPassword,
    role: 'SAAS_SUPERADMIN',
    isActive: true,
    ...overrides,
  });

  beforeAll(async () => {
    hashedPassword = await bcrypt.hash(RAW_PASSWORD, 10);
  });

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      userClinic: { findMany: jest.fn().mockResolvedValue([]) },
    };

    // signAsync is mocked but delegates to the real `jsonwebtoken` lib so the
    // resulting token is a genuine, independently-verifiable JWT — not just a
    // recorded call — which lets us assert on the *actual signed claims*.
    jwtService = {
      signAsync: jest.fn((payload: any, options: any) =>
        Promise.resolve(jwt.sign(payload, JWT_TEST_SECRET, { expiresIn: options?.expiresIn })),
      ),
      verifyAsync: jest.fn((token: string) => {
        try {
          return Promise.resolve(jwt.verify(token, JWT_TEST_SECRET));
        } catch (err) {
          return Promise.reject(err);
        }
      }),
    };

    emailService = { sendEmail: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('başarılı girişte clinicId/tenantId claim\'i doğru olan geçerli bir JWT üretir', async () => {
      const user = buildUser();
      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.login({ email: 'ada@example.com', password: RAW_PASSWORD });

      expect(result.access_token).toEqual(expect.any(String));
      expect(result.refresh_token).toEqual(expect.any(String));

      // Token gerçekten doğrulanabilir mi ve claim'ler doğru mu?
      const decodedAccess = jwt.verify(result.access_token, JWT_TEST_SECRET) as any;
      expect(decodedAccess.sub).toBe(user.id);
      expect(decodedAccess.tenantId).toBe(CLINIC_A_ID);
      expect(decodedAccess.role).toBe('SAAS_SUPERADMIN');
      expect(decodedAccess.email).toBe('ada@example.com'); // decrypt edilmiş email

      const decodedRefresh = jwt.verify(result.refresh_token, JWT_TEST_SECRET) as any;
      expect(decodedRefresh.tenantId).toBe(CLINIC_A_ID);

      // Response body & süreler
      expect(result.expires_in).toBe(28800);
      expect(result.user.clinicId).toBe(CLINIC_A_ID);
      expect(result.user.email).toBe('ada@example.com');
      expect(result.user.role).toBe('SAAS_SUPERADMIN');
    });

    it('kullanıcının bağlı olduğu birden fazla kliniği (multi-tenant) clinics listesinde döner', async () => {
      const user = buildUser();
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.userClinic.findMany.mockResolvedValue([
        {
          role: 'SAAS_SUPERADMIN',
          isActive: true,
          clinic: { id: CLINIC_A_ID, name: 'A Kliniği', status: 'ACTIVE', plan: 'PRO' },
        },
        {
          role: 'SAAS_SUPPORT',
          isActive: true,
          clinic: { id: 'clinic-bbb-222', name: 'B Kliniği', status: 'ACTIVE', plan: 'BASIC' },
        },
      ]);

      const result = await service.login({ email: 'ada@example.com', password: RAW_PASSWORD });

      expect(result.clinics).toHaveLength(2);
      expect(result.clinics.map((c: any) => c.id)).toEqual([CLINIC_A_ID, 'clinic-bbb-222']);
    });

    it('UserClinic kaydı yoksa fallback olarak kullanıcının kendi clinicId\'sini tek klinik olarak döner', async () => {
      const user = buildUser();
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.userClinic.findMany.mockResolvedValue([]);

      const result = await service.login({ email: 'ada@example.com', password: RAW_PASSWORD });

      expect(result.clinics).toHaveLength(1);
      expect(result.clinics[0].id).toBe(CLINIC_A_ID);
      expect(result.clinics[0].role).toBe('SAAS_SUPERADMIN');
    });

    it('yanlış şifre ile girişi reddeder', async () => {
      const user = buildUser();
      prisma.user.findUnique.mockResolvedValue(user);

      await expect(
        service.login({ email: 'ada@example.com', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('var olmayan kullanıcı için girişi reddeder', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: RAW_PASSWORD }),
      ).rejects.toThrow(UnauthorizedException);

      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('deaktif (isActive=false) kullanıcı için girişi reddeder', async () => {
      const user = buildUser({ isActive: false });
      prisma.user.findUnique.mockResolvedValue(user);

      await expect(
        service.login({ email: 'ada@example.com', password: RAW_PASSWORD }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('şifresi olmayan (daveti kabul edilmemiş) kullanıcı için girişi reddeder', async () => {
      const user = buildUser({ password: null });
      prisma.user.findUnique.mockResolvedValue(user);

      await expect(
        service.login({ email: 'ada@example.com', password: RAW_PASSWORD }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('email veya şifre eksikse BadRequestException fırlatır', async () => {
      await expect(service.login({ email: '', password: RAW_PASSWORD } as any)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.login({ email: 'ada@example.com', password: '' } as any)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('kullanıcıyı emailHash ile arar (düz email ile değil) — PII sızıntısını önler', async () => {
      const user = buildUser();
      prisma.user.findUnique.mockResolvedValue(user);

      await service.login({ email: 'ada@example.com', password: RAW_PASSWORD });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { emailHash: EncryptionUtil.hashEmail('ada@example.com') },
      });
    });
  });

  describe('refreshToken', () => {
    it('geçerli bir refresh token ile doğru tenantId claim\'ine sahip yeni bir access token üretir', async () => {
      const user = buildUser();
      const validRefreshToken = jwt.sign({ sub: user.id }, JWT_TEST_SECRET);
      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.refreshToken({ refreshToken: validRefreshToken });

      const decoded = jwt.verify(result.access_token, JWT_TEST_SECRET) as any;
      expect(decoded.sub).toBe(user.id);
      expect(decoded.tenantId).toBe(CLINIC_A_ID);
      expect(result.refresh_token).toBe(validRefreshToken); // aynı kalmalı
    });

    it('geçersiz/süresi dolmuş refresh token ile reddeder', async () => {
      await expect(
        service.refreshToken({ refreshToken: 'not-a-valid-jwt' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('token geçerli ama kullanıcı artık deaktifse reddeder', async () => {
      const user = buildUser({ isActive: false });
      const validRefreshToken = jwt.sign({ sub: user.id }, JWT_TEST_SECRET);
      prisma.user.findUnique.mockResolvedValue(user);

      await expect(
        service.refreshToken({ refreshToken: validRefreshToken }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    it('doğru eski şifre ile şifreyi değiştirir ve yeni hash\'i persist eder', async () => {
      const user = buildUser();
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue({ ...user });

      const result = await service.changePassword(user.id, RAW_PASSWORD, 'YeniGuvenliSifre1!');

      expect(result.message).toMatch(/başarıyla/i);
      const updateArgs = prisma.user.update.mock.calls[0][0];
      expect(updateArgs.where).toEqual({ id: user.id });
      const matches = await bcrypt.compare('YeniGuvenliSifre1!', updateArgs.data.password);
      expect(matches).toBe(true);
    });

    it('yanlış eski şifre ile reddeder ve günceleme yapmaz', async () => {
      const user = buildUser();
      prisma.user.findUnique.mockResolvedValue(user);

      await expect(
        service.changePassword(user.id, 'yanlis-eski-sifre', 'YeniGuvenliSifre1!'),
      ).rejects.toThrow(UnauthorizedException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('var olmayan kullanıcı için de aynı pozitif mesajı döner (user enumeration koruması)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword('nobody@example.com');

      expect(result.message).toMatch(/gönderildi/i);
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('var olan kullanıcı için sıfırlama e-postası gönderir', async () => {
      const user = buildUser();
      prisma.user.findUnique.mockResolvedValue(user);

      await service.forgotPassword('ada@example.com');

      expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
      expect(emailService.sendEmail.mock.calls[0][0]).toBe('ada@example.com');
    });
  });

  describe('resetPassword', () => {
    it('geçerli, süresi dolmamış bir reset token ile şifreyi günceller', async () => {
      const user = buildUser();
      prisma.user.update.mockResolvedValue({ ...user });

      const payload = JSON.stringify({ userId: user.id, expiresAt: Date.now() + 15 * 60 * 1000 });
      const token = EncryptionUtil.encrypt(payload);

      const result = await service.resetPassword(token, 'YeniGuvenliSifre1!');

      expect(result.message).toMatch(/güncellendi/i);
      const updateArgs = prisma.user.update.mock.calls[0][0];
      expect(updateArgs.where).toEqual({ id: user.id });
      const matches = await bcrypt.compare('YeniGuvenliSifre1!', updateArgs.data.password);
      expect(matches).toBe(true);
    });

    it('süresi dolmuş reset token\'ı reddeder ve günceleme yapmaz', async () => {
      const user = buildUser();
      const payload = JSON.stringify({ userId: user.id, expiresAt: Date.now() - 1000 });
      const token = EncryptionUtil.encrypt(payload);

      await expect(service.resetPassword(token, 'YeniGuvenliSifre1!')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('bozuk/geçersiz token ile reddeder', async () => {
      await expect(service.resetPassword('not-a-valid-token', 'YeniGuvenliSifre1!')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
