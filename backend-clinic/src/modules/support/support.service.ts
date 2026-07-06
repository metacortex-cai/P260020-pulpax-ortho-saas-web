import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface TicketComment {
  id: string;
  sender: 'user' | 'agent';
  senderName: string;
  text: string;
  date: string;
}

@Injectable()
export class SupportService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly prisma: PrismaService
  ) {}

  async createTicket(
    clinicId: string,
    userId: string,
    subject: string,
    category: string,
    priority: string,
    description: string
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const userName = user ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Kullanıcı';

    const client = await this.tenantPrisma.getClient();

    const initialComment: TicketComment = {
      id: '1',
      sender: 'user',
      senderName: userName,
      text: description,
      date: new Date().toISOString()
    };

    return client.notification.create({
      data: {
        clinicId,
        userId,
        type: 'TICKET',
        title: subject,
        link: `${category}|${priority}`,
        message: JSON.stringify([initialComment]),
        isRead: false // active/open
      }
    });
  }

  async findAllTickets(clinicId: string) {
    const client = await this.tenantPrisma.getClient();
    const records = await client.notification.findMany({
      where: { clinicId, type: 'TICKET' },
      orderBy: { createdAt: 'desc' }
    });

    return records.map(r => {
      const [category, priority] = (r.link || 'Diğer|Normal').split('|');
      let comments: TicketComment[] = [];
      try {
        comments = JSON.parse(r.message);
      } catch {
        comments = [{ id: '1', sender: 'user', senderName: 'Klinik', text: r.message, date: r.createdAt.toISOString() }];
      }

      // Check if last message is from agent -> status is 'BEKLEMEDE' (waiting for user), else 'AÇIK'
      let status = r.isRead ? 'KAPALI' : 'AÇIK';
      if (!r.isRead && comments.length > 0) {
        const lastComment = comments[comments.length - 1];
        if (lastComment.sender === 'agent') {
          status = 'BEKLEMEDE';
        }
      }

      return {
        id: r.id,
        subject: r.title,
        category,
        priority,
        status,
        date: r.createdAt.toLocaleDateString('tr-TR'),
        lastUpdate: 'Bugün',
        comments
      };
    });
  }

  async addReply(ticketId: string, clinicId: string, userId: string, replyText: string, isAgent = false) {
    const client = await this.tenantPrisma.getClient();
    const record = await client.notification.findFirst({
      where: { id: ticketId, clinicId, type: 'TICKET' }
    });

    if (!record) throw new NotFoundException('Destek talebi bulunamadı.');

    let comments: TicketComment[] = [];
    try {
      comments = JSON.parse(record.message);
    } catch {
      comments = [];
    }

    let senderName = 'Destek Temsilcisi';
    if (!isAgent) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      senderName = user ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Kullanıcı';
    }

    const newComment: TicketComment = {
      id: (comments.length + 1).toString(),
      sender: isAgent ? 'agent' : 'user',
      senderName,
      text: replyText,
      date: new Date().toISOString()
    };

    comments.push(newComment);

    const updated = await client.notification.update({
      where: { id: ticketId },
      data: {
        message: JSON.stringify(comments),
        // If user replies, mark as unread (not closed, needs attention)
        isRead: false
      }
    });

    // Simulated Auto-Reply from Support Agent:
    // To make it feel extremely interactive and realistic, let's trigger an automatic mock agent reply 2 seconds later in the background!
    if (!isAgent) {
      setTimeout(async () => {
        try {
          const autoComments = JSON.parse(updated.message);
          const autoReply: TicketComment = {
            id: (autoComments.length + 1).toString(),
            sender: 'agent',
            senderName: 'Müşteri Temsilcisi (SaaS)',
            text: `Merhaba, talebiniz alınmıştır. Ekibimiz detayları inceleyip en kısa sürede dönüş yapacaktır. Paylaştığınız detaylar için teşekkür ederiz.`,
            date: new Date().toISOString()
          };
          autoComments.push(autoReply);
          await client.notification.update({
            where: { id: ticketId },
            data: { message: JSON.stringify(autoComments) }
          });
        } catch (err) {
          console.error('Failed to issue simulated support agent reply:', err);
        }
      }, 2000);
    }

    return updated;
  }

  async closeTicket(ticketId: string, clinicId: string) {
    const client = await this.tenantPrisma.getClient();
    return client.notification.updateMany({
      where: { id: ticketId, clinicId, type: 'TICKET' },
      data: { isRead: true } // Closed
    });
  }
}
