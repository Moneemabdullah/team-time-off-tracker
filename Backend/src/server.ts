import 'dotenv/config';

import { env } from './config/env';
import app from './app';
import { connectDB } from './config/db';
import { initSocket } from './socket';

connectDB(env.mongoUri)
  .then(() => {
    const server = app.listen(env.port, () => {
      console.log(`Server running on port ${env.port}`);
    });

    // Shares the HTTP server and its port; no separate listener is opened.
    initSocket(server);
  })
  .catch((err: unknown) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
