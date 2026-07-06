import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import * as bcrypt from 'bcrypt';
import { EncryptionUtil } from '../../common/utils/encryption.util';
import { EmailService } from '../email/email.service';


@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly BCRYPT_ROUNDS = 10;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private readonly emailService: EmailService
  ) {}

  async login(loginDto: LoginDto) {
    if (!loginDto.email || !loginDto.password) {
      throw new BadRequestException('Email ve şifre gereklidir.');
    }

    const emailHash = EncryptionUtil.hashEmail(loginDto.email);
    const user = await this.prisma.user.findUnique({
      where: { emailHash }
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Kullanıcı bulunamadı veya şifre hatalı.');
    }

    if (!user.password) {
      throw new UnauthorizedException('Bu hesap için davet henüz kabul edilmedi. Lütfen e-postanıza gönderilen daveti kullanarak şifrenizi belirleyin.');
    }

    // bcrypt ile şifre doğrulama
    const passwordMatches = await bcrypt.compare(loginDto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Şifre hatalı.');
    }

    const decryptedEmail = EncryptionUtil.decrypt(user.email) || user.email;

    // Kullanıcının bağlı olduğu tüm klinikleri getir (Multi-Tenant)
    const userClinics = await this.prisma.userClinic.findMany({
      where: { userId: user.id },
      include: {
        clinic: {
          select: { id: true, name: true, status: true, plan: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Eğer UserClinic kaydı yoksa, mevcut clinicId üzerinden fallback
    const clinics = userClinics.length > 0
      ? userClinics.map(uc => ({
          id: uc.clinic.id,
          name: uc.clinic.name,
          status: uc.clinic.status,
          plan: uc.clinic.plan,
          role: uc.role,
          isActive: uc.isActive,
        }))
      : [{
          id: user.clinicId,
          name: 'Varsayılan Klinik',
          status: 'ACTIVE',
          plan: 'PRO',
          role: user.role,
          isActive: true,
        }];

    // JWT Payload — henüz klinik seçilmedi, tenantId boş bırakılır
    const payload = { 
      sub: user.id, 
      email: decryptedEmail, 
      role: user.role, 
      tenantId: user.clinicId
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '8h',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: '30d',
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 28800, // 8 hours in seconds
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: decryptedEmail,
        role: user.role,
        clinicId: user.clinicId
      },
      clinics, // Kullanıcının bağlı olduğu kliniklerin listesi
    };
  }

  /**
   * Refresh token ile yeni access token oluştur
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshTokenDto.refreshToken);

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub }
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Kullanıcı bulunamadı veya deaktif.');
      }

      const newPayload = {
        sub: user.id,
        email: EncryptionUtil.decrypt(user.email) || user.email,
        role: user.role,
        tenantId: user.clinicId
      };

      const accessToken = await this.jwtService.signAsync(newPayload, {
        expiresIn: '8h',
      });

      return {
        access_token: accessToken,
        refresh_token: refreshTokenDto.refreshToken, // Refresh token aynı kalır
        expires_in: 28800,
      };
    } catch (error) {
      this.logger.warn(`Refresh token doğrulaması başarısız: ${error?.message || error}`);
      throw new UnauthorizedException('Refresh token geçersiz veya süresi dolmuş.');
    }
  }

  /**
   * Şifre hashleme (yeni kullanıcı oluşturulurken)
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.BCRYPT_ROUNDS);
  }

  /**
   * Şifre değişikliği
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new UnauthorizedException('Kullanıcı bulunamadı.');
    }

    const passwordMatches = await bcrypt.compare(oldPassword, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Eski şifre hatalı.');
    }

    const hashedPassword = await this.hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    return { message: 'Şifre başarıyla değiştirildi.' };
  }

  async forgotPassword(email: string) {
    if (!email) {
      throw new BadRequestException('E-posta adresi gereklidir.');
    }

    const emailHash = EncryptionUtil.hashEmail(email);
    const user = await this.prisma.user.findUnique({
      where: { emailHash }
    });

    // Security practice: Always return positive message even if user does not exist to prevent user enumeration
    if (!user) {
      return { message: 'Şifre sıfırlama linki e-posta adresinize gönderildi.' };
    }

    const payload = JSON.stringify({
      userId: user.id,
      expiresAt: Date.now() + 15 * 60 * 1000
    });

    const token = EncryptionUtil.encrypt(payload);
    const resetLink = `http://localhost:7001/login?resetToken=${encodeURIComponent(token)}`;

    // Premium HTML Email Design
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 580px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
            border: 1px border #e2e8f0;
          }
          .header {
            background-color: #6d28d9;
            background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
            padding: 40px 20px;
            text-align: center;
            color: #ffffff;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.5px;
          }
          .content {
            padding: 40px 30px;
            line-height: 1.6;
          }
          .content h2 {
            font-size: 20px;
            font-weight: 700;
            margin-top: 0;
            color: #0f172a;
          }
          .btn-container {
            text-align: center;
            margin: 30px 0;
          }
          .btn {
            display: inline-block;
            background-color: #7c3aed;
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 30px;
            font-weight: 700;
            font-size: 14px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(124, 58, 237, 0.25);
            transition: all 0.2s ease;
          }
          .footer {
            background-color: #f8fafc;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
          }
          .warning {
            font-size: 12px;
            color: #94a3b8;
            margin-top: 20px;
            border-top: 1px dashed #e2e8f0;
            padding-top: 15px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Pulpax SaaS</h1>
          </div>
          <div class="content">
            <h2>Merhaba ${user.firstName},</h2>
            <p>Pulpax hesabınız için bir şifre sıfırlama talebinde bulundunuz. Yeni bir şifre belirlemek için aşağıdaki butona tıklayabilirsiniz:</p>
            
            <div class="btn-container">
              <a href="${resetLink}" class="btn">Şifremi Sıfırla</a>
            </div>

            <p>Eğer buton çalışmıyorsa aşağıdaki bağlantıyı kopyalayıp tarayıcınızın adres çubuğuna yapıştırabilirsiniz:</p>
            <p style="word-break: break-all; font-size: 13px; color: #6d28d9;"><a href="${resetLink}">${resetLink}</a></p>

            <div class="warning">
              <p>⚠️ Bu bağlantı güvenlik nedeniyle <strong>15 dakika</strong> geçerlidir. Eğer bu talebi siz yapmadıysanız lütfen bu e-postayı dikkate almayın; hesabınız güvendedir.</p>
            </div>
          </div>
          <div class="footer">
            © 2026 Pulpax. Tüm Hakları Saklıdır.
          </div>
        </div>
      </body>
      </html>
    `;

    // Deliver the email
    await this.emailService.sendEmail(
      email,
      'Pulpax Şifre Sıfırlama Talebi',
      emailHtml
    );

    return { 
      message: 'Şifre sıfırlama linki e-posta adresinize gönderildi.'
    };
  }

  async resetPassword(token: string, newPassword: string) {
    if (!token || !newPassword) {
      throw new BadRequestException('Geçersiz istek parametreleri.');
    }

    const decrypted = EncryptionUtil.decrypt(token);
    if (!decrypted) {
      throw new BadRequestException('Geçersiz veya bozulmuş sıfırlama linki.');
    }

    try {
      const { userId, expiresAt } = JSON.parse(decrypted);

      if (Date.now() > expiresAt) {
        throw new BadRequestException('Şifre sıfırlama linkinin süresi dolmuş.');
      }

      const hashedPassword = await this.hashPassword(newPassword);

      await this.prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });

      return { message: 'Şifreniz başarıyla güncellendi.' };
    } catch (err) {
      throw new BadRequestException(err.message || 'Şifre sıfırlama başarısız.');
    }
  }

  /**
   * Davet kabul — şifresiz oluşturulan personel hesabına ilk şifreyi belirler.
   */
  async acceptInvite(token: string, newPassword: string) {
    if (!token || !newPassword) {
      throw new BadRequestException('Geçersiz istek parametreleri.');
    }

    const decrypted = EncryptionUtil.decrypt(token);
    if (!decrypted) {
      throw new BadRequestException('Geçersiz veya bozulmuş davet linki.');
    }

    let payload: { userId: string; purpose?: string; expiresAt: number };
    try {
      payload = JSON.parse(decrypted);
    } catch {
      throw new BadRequestException('Geçersiz davet linki.');
    }

    if (payload.purpose !== 'INVITE') {
      throw new BadRequestException('Geçersiz davet linki.');
    }

    if (Date.now() > payload.expiresAt) {
      throw new BadRequestException('Davet linkinin süresi dolmuş. Lütfen yöneticinizden yeni bir davet talep edin.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      throw new BadRequestException('Kullanıcı bulunamadı.');
    }
    if (user.password) {
      throw new BadRequestException('Bu davet daha önce kullanılmış. Şifrenizi değiştirmek için "Şifremi Unuttum" seçeneğini kullanabilirsiniz.');
    }

    const hashedPassword = await this.hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return { message: 'Hesabınız aktifleştirildi. Artık giriş yapabilirsiniz.' };
  }
}

