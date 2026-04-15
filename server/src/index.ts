import express from 'express';
import { config } from './config.js';
import cors from 'cors';
import router from './router/index.js';
import { createLogger } from './logger/index.js';
import userService from './services/UserServiceSQLite.js';
import swaggerUi from 'swagger-ui-express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const port = config.PORT;
const logger = createLogger('CertsAPI');

app.use(cors());
app.use(express.json());

app.use('/api', router);

const swaggerFile = fs.readFileSync('./swagger.yaml', 'utf8');
const swaggerDocument = YAML.parse(swaggerFile);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Serve React build (production)
// In dev the CRA dev-server handles this; in production the compiled
// server serves the built client from certs-view-client/build.
const clientBuild = path.resolve(__dirname, '../../certs-view-client/build');
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  // SPA catch-all — return index.html for any route that isn't /api or /api-docs
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
  logger.info(`Serving React client from ${clientBuild}`);
}

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down server...');
  userService.close();
  process.exit(0);
});

app.listen(port, () => {
  logger.info(`Server is running on PORT: ${port}`);
});
