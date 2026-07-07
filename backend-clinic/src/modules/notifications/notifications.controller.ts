import { Controller, Get, Patch, Param, Sse, UseGuards, Request, Post, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Observable, map } from 'rxjs';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getUnread(@Request() req) {
    const user = req.user;
    return this.notificationsService.getUnread(user.clinicId, user.userId);
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    const user = req.user;
    return this.notificationsService.markAsRead(id, user.clinicId, user.userId);
  }

  @Sse('stream')
  stream(@Request() req): Observable<MessageEvent> {
    const user = req.user;
    return this.notificationsService.getStream(user.clinicId, user.userId).pipe(
      map((event) => {
        return {
          data: event.notification,
        } as MessageEvent;
      })
    );
  }

  // Debug/Test endpoint to trigger a notification
  @Post('test')
  async testNotification(@Request() req, @Body() body: any) {
    const user = req.user;
    return this.notificationsService.create({
      clinicId: user.clinicId,
      userId: user.userId,
      type: body.type || 'INFO',
      title: body.title || 'Test Bildirimi',
      message: body.message || 'Bu bir test bildirimidir.',
      link: body.link,
    });
  }
}
