import { Controller, Get, Post, Param, Headers, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ProtocolsService } from './protocols.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Protocols / USS Entegrasyon')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('protocols')
export class ProtocolsController {
  constructor(private readonly protocolsService: ProtocolsService) {}

  @Get()
  @ApiOperation({ summary: 'Get list of clinic protocols' })
  @ApiResponse({ status: 200, description: 'List of protocols retrieved successfully.' })
  findAll(@Headers('X-Tenant-ID') clinicId: string) {
    return this.protocolsService.findAll(clinicId);
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Sync specific protocol to USS' })
  @ApiResponse({ status: 200, description: 'Protocol sync process executed.' })
  syncProtocol(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.protocolsService.syncProtocol(id, clinicId);
  }
}
