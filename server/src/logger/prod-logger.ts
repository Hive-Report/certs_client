import type { Logger } from 'winston';
import { createLogger, format, transports } from 'winston';

function buildProdLogger(): Logger {
  return createLogger({
    level: 'info',
    format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
    transports: [
      new transports.Console(),
      new transports.File({ filename: '/app/logs/prod.log' }),
    ],
  });
}

export default buildProdLogger;
