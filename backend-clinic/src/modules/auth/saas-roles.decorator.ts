import { SetMetadata } from '@nestjs/common';

export const SAAS_ROLES_KEY = 'saas_roles';
export const SaasRoles = (...roles: string[]) => SetMetadata(SAAS_ROLES_KEY, roles);
