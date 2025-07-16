import express from 'express';
import { config } from './config.js';
import cors from 'cors';
import router from './router/index.js';

const app = express();
const port = config.PORT;

app.use(cors());
app.use(express.json());

app.use('/api', router);