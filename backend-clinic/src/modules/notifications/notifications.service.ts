import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { Subject, Observable, filter } from 'rxjs';
export interface NotificationEvent {
  clinicId: string;
  userId?: string;
  notification: any;
}

@Injectable()
export class NotificationsService {
  private notificationsSubject = new Subject<NotificationEvent>();

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

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
}
