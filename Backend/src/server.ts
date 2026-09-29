import 'dotenv/config';

import { env } from './config/env';
import app from './app';
import { connectDB } from './config/db';

connectDB(env.mongoUri)
  .then(() => {
    app.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
    });
  })
  .catch((err: unknown) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
