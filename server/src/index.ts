import express from 'express';
import { config } from './config.js';
import cors from 'cors';
import router from './router/index.js';
import { createLogger } from './logger/index.js';
import userService from './services/UserServiceSQLite.js';
import swaggerUi from 'swagger-ui-express';
import fs from 'node:fs';
import YAML from 'yaml';

const app = express();
const port = config.PORT;
const logger = createLogger('CertsAPI');

app.use(cors());
app.use(express.json());

app.use('/api', router);

const swaggerFile = fs.readFileSync('./swagger.yaml', 'utf8');
const swaggerDocument = YAML.parse(swaggerFile);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down server...');
  userService.close();
  process.exit(0);
});

app.listen(port, () => {
  logger.info(`Server is running on PORT: ${port}`);
});
