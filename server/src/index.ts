import express from 'express';
import { config } from './config.js';
import cors from 'cors';
import router from './router/index.js';
import { createLogger } from './logger/index.js';
import userService from './services/UserServiceSQLite.js';

const app = express();
const port = config.PORT;
const logger = createLogger('CertsAPI');

app.use(cors({
  origin: ['http://localhost:3002', 'https://certs-client.onrender.com'],
  credentials: true
}));
app.use(express.json());

app.use('/api', router);

// Ініціалізація демо користувачів
userService.initializeDemoUsers().then(() => {
  logger.info('Demo users initialized');
}).catch(error => {
  logger.error('Failed to initialize demo users:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down server...');
  userService.close();
  process.exit(0);
});

app.listen(port, () => {
  logger.info(`Server is running on PORT: ${port}`);
});
