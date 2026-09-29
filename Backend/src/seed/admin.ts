import 'dotenv/config';

import mongoose from 'mongoose';

import { env } from '../config/env';
import { connectDB } from '../config/db';
import { userModel } from '../models/user.model';
import { hashPassword } from '../services/auth.service';

/**
 * Creates the initial admin from ADMIN_* env vars.
 *
 * Safe to run repeatedly: an admin that already exists is left untouched, so
 * the script never produces duplicates or resets a password that was changed
 * later. The password is never logged.
 */
export async function seedAdmin(): Promise<'created' | 'exists'> {
  const { name, email, password } = env.admin;

  if (!password) {
    throw new Error('ADMIN_PASSWORD is not set. Refusing to seed a known default.');
  }

  const existing = await userModel.findOne({ email });
  if (existing) {
    return 'exists';
  }

  await userModel.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    role: 'ADMIN',
    annualLeaveBalance: 20,
  });

  return 'created';
}

async function main(): Promise<void> {
  await connectDB(env.mongoUri);
  console.log('MongoDB connected');

  const result = await seedAdmin();
  console.log(
    result === 'created'
      ? `Admin created: ${env.admin.email}`
      : `Admin already exists: ${env.admin.email} (left unchanged)`
  );

  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch((err: unknown) => {
    console.error('Admin seed failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
