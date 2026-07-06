import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsString, IsNotEmpty, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Staging = 'staging',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  PORT: number = 6000;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @IsString()
  REDIS_HOST: string = 'localhost';

  @IsNumber()
  REDIS_PORT: number = 6379;
}

export function validate(config: Record<string, any>) {
  const validatedConfig = plainToInstance(
    EnvironmentVariables,
    config,
    { enableImplicitConversion: true },
  );
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    console.error('❌ Environment configuration validation failed:');
    errors.forEach(err => {
      console.error(`- Property "${err.property}" failed with constraints:`, err.constraints);
    });
    throw new Error('Invalid environment configuration');
  }
  return validatedConfig;
}
