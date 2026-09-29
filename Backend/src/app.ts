import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';

import routes from './routes';
import swaggerDocument from './config/swagger';
import { errorHandler } from './controllers/request.controller';

const app = express();

// Lets the Vite dev server (a different origin) call this API from the browser.
app.use(cors());

app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/', routes);

app.use(errorHandler);

export default app;
