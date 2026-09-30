import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import routes from './routes';
import swaggerDocument from './config/swagger';
import { errorHandler } from './shared/errorHandler';

const app = express();

const allowedOrigins = env.corsOrigin.split(',').map((origin) => origin.trim());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Required before the routers so `req.cookies` is populated for authToken.
app.use(cookieParser());

app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/', routes);

// Catches errors thrown from a matched route. Note this does NOT cover requests
// that match no route at all: those still get Express's default HTML 404.
app.use(errorHandler);

export default app;
