import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Subject, Observable, filter } from 'rxjs';
export interface NotificationEvent {
  clinicId: string;
  userId?: string;
  notification: any;
}

@Injectable()
export class NotificationsService {
  private notificationsSubject = new Subject<NotificationEvent>();

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly prisma: PrismaService
  ) {}

  // Observable stream for SSE
  getStream(clinicId: string, userId: string): Observable<NotificationEvent> {
    return this.notificationsSubject.asObservable().pipe(
      filter(event => event.clinicId === clinicId && (!event.userId || event.userId === userId))
    );
  }

  async create(data: { clinicId: string; userId?: string; type: string; title: string; message: string; link?: string }) {
    const client = await this.tenantPrisma.getClient();
    const notification = await client.notification.create({
      data: {
        clinicId: data.clinicId,
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link,
      },
    });

    // Push to realtime stream
    this.notificationsSubject.next({
      clinicId: data.clinicId,
      userId: data.userId,
      notification,
    });

    return notification;
  }

  async getUnread(clinicId: string, userId: string) {
    const client = await this.tenantPrisma.getClient();
    return client.notification.findMany({
      where: {
        clinicId,
        OR: [{ userId: null }, { userId }],
        isRead: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(id: string, clinicId: string, userId: string) {
    const client = await this.tenantPrisma.getClient();
    // Validate ownership before marking
    const notif = await client.notification.findFirst({
      where: { id, clinicId, OR: [{ userId: null }, { userId }] }
    });
    if (!notif) return null;

    return client.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async sendChatMessage(senderId: string, message: string, recipientId: string | null, clinicId: string) {
    const sender = await this.prisma.user.findUnique({
      where: { id: senderId }
    });
    const senderName = sender ? `${sender.firstName} ${sender.lastName || ''}`.trim() : 'Bilinmeyen Kullanıcı';

    const client = await this.tenantPrisma.getClient();
    const notification = await client.notification.create({
      data: {
        clinicId,
        userId: recipientId,
        type: 'CHAT',
        title: senderName,
        message: message,
        link: senderId, // Store senderId in link field to check message ownership in frontend
      },
    });

    // Broadcast via SSE
    this.notificationsSubject.next({
      clinicId,
      userId: recipientId,
      notification,
    });

    return notification;
  }

  async getChatHistory(clinicId: string, userId: string) {
    const client = await this.tenantPrisma.getClient();
    return client.notification.findMany({
      where: {
        clinicId,
        type: 'CHAT',
        OR: [
          { userId: null },
          { userId },
          { link: userId }
        ]
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
  }
}
