import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, DeactivateUserDto, TransferSystemAdminDto } from './dto/update-user.dto';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto, @Req() req: any) {
    return this.usersService.create(dto, req.user.tenantId);
  }

  @Get()
  findAll(@Query('includePassive') includePassive: string, @Req() req: any) {
    return this.usersService.findAll(req.user.tenantId, includePassive === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.usersService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: any) {
    return this.usersService.update(id, dto, req.user.tenantId);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string, @Body() dto: DeactivateUserDto, @Req() req: any) {
    return this.usersService.deactivate(id, req.user.tenantId, dto.reason);
  }

  @Patch(':id/reactivate')
  reactivate(@Param('id') id: string, @Req() req: any) {
    return this.usersService.reactivate(id, req.user.tenantId);
  }

  // Çağıran kullanıcının (req.user.id) mevcut Sistem Yöneticisi olduğu doğrulanır.
  @Post('transfer-system-admin')
  transferSystemAdmin(@Body() dto: TransferSystemAdminDto, @Req() req: any) {
    return this.usersService.transferSystemAdmin(req.user.id, dto, req.user.tenantId);
  }
}
