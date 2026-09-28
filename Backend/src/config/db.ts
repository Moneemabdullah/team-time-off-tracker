import mongoose from 'mongoose';

const MAX_ATTEMPTS = Number(process.env.MONGO_CONNECT_MAX_ATTEMPTS) || 10;
const RETRY_DELAY_MS = Number(process.env.MONGO_CONNECT_RETRY_DELAY_MS) || 2000;
const SERVER_SELECTION_TIMEOUT_MS = 10000;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function connectDB(uri: string): Promise<typeof mongoose> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS });
      console.log(`MongoDB connected (attempt ${attempt}/${MAX_ATTEMPTS})`);
      return mongoose;
    } catch (err) {
      lastError = err;
      if (attempt === MAX_ATTEMPTS) break;
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`MongoDB attempt ${attempt}/${MAX_ATTEMPTS} failed: ${message}`);
      await sleep(RETRY_DELAY_MS);
    }
  }

  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `Failed to connect to MongoDB after ${MAX_ATTEMPTS} attempts: ${detail}`
  );
}

export default connectDB;
