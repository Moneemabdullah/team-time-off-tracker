import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Approving a request uses a transaction, and `mongodb-memory-server` is a
    // standalone mongod that cannot. These tests therefore need the Docker
    // replica set the app already uses:
    //
    //   docker compose up -d mongodb mongodb-init
    //
    // directConnection lets the host reach the replica set member, which is
    // advertised under its container name.
    env: {
      TEST_MONGODB_URI:
        'mongodb://127.0.0.1:27017/team-time-off-tracker-socket-test?replicaSet=rs0&directConnection=true',
    },
    hookTimeout: 30_000,
    testTimeout: 30_000,
    // The suite shares one replica set and one HTTP server, so files must not
    // run concurrently. Single file today; this keeps that true as it grows.
    fileParallelism: false,
  },
});