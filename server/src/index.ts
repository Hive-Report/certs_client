import express from 'express';
import { config } from './config.js';
import cors from 'cors';
import router from './router/index.js';
import { createLogger } from './logger/index.js';

const app = express();
const port = config.PORT;
const logger = createLogger('CertsAPI');

app.use(cors());
app.use(express.json());

app.use('/api', router);

app.listen(port, () => {
  logger.info(`Server is running on PORT: ${port}`);
});
