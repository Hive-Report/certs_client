import 'dotenv/config';
import type { Config } from './types';

const isTestEnvironment =
  process.env.NODE_ENV === 'test' ||
  process.env.JEST_WORKER_ID !== undefined ||
  process.env.CI === 'true';

const getTestConfig = (): Config => {
  return {
    PORT: '3001',
    NODE_ENV: 'test',
    CERTS_API_KEY: 'test-token',
    JWT_SECRET: 'test-secret',
    ALLOWED_EMAIL_DOMAINS: 'test.com,example.com',
  };
};

const getProductionConfig = (): Config => {
  const required = (name: string, value: unknown): string => {
    if (value === undefined || value === null) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value as string;
  };

  const port = process.env.PORT ?? '3001';
  if (isNaN(Number(port))) {
    throw new Error('PORT must be a valid number');
  }

  return {
    PORT: required('PORT', process.env.PORT),
    NODE_ENV: required('NODE_ENV', process.env.NODE_ENV),
    CERTS_API_KEY: required('CERTS_API_KEY', process.env.CERTS_API_KEY),
    JWT_SECRET: required('JWT_SECRET', process.env.JWT_SECRET),
    ALLOWED_EMAIL_DOMAINS: required('ALLOWED_EMAIL_DOMAINS', process.env.ALLOWED_EMAIL_DOMAINS),
  };
};

export const config: Config = isTestEnvironment ? getTestConfig() : getProductionConfig();
