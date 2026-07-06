import { Controller, Get, Post, Body, Param, Patch, Headers, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SupportService } from './support.service';

@Controller('support/tickets')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get()
  async getTickets(@Headers('X-Tenant-ID') clinicId: string) {
    return this.supportService.findAllTickets(clinicId);
  }

  @Post()
  async createTicket(
    @Request() req,
    @Headers('X-Tenant-ID') clinicId: string,
    @Body() body: { subject: string; category: string; priority: string; description: string }
  ) {
    return this.supportService.createTicket(
      clinicId,
      req.user?.id,
      body.subject,
      body.category,
      body.priority,
      body.description
    );
  }

  @Post(':id/reply')
  async replyTicket(
    @Request() req,
    @Param('id') id: string,
    @Headers('X-Tenant-ID') clinicId: string,
    @Body() body: { text: string }
  ) {
    return this.supportService.addReply(
      id,
      clinicId,
      req.user?.id,
      body.text,
      false // user reply
    );
  }

  @Patch(':id/close')
  async closeTicket(
    @Param('id') id: string,
    @Headers('X-Tenant-ID') clinicId: string
  ) {
    return this.supportService.closeTicket(id, clinicId);
  }
}
