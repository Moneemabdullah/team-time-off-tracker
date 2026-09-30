import ejs from 'ejs';
import fs from 'fs';
import nodemailer from 'nodemailer';
import path from 'path';

import { env } from '../config/env';
import { AppError } from './AppError';

const transportOptions = {
  host: env.emailSender.host,
  port: env.emailSender.port,
  // Implicit TLS only on 465. Mailpit and most local relays use plain SMTP.
  secure: env.emailSender.port === 465,
  // Mailpit accepts no authentication, and nodemailer still attempts
  // AUTH LOGIN if a blank credential object is passed.
  ...(env.emailSender.user
    ? { auth: { user: env.emailSender.user, pass: env.emailSender.password } }
    : {}),
};

const transporter = nodemailer.createTransport(transportOptions);

interface ISendEmailOptions {
  to: string;
  subject: string;
  template: string;
  templateData: Record<string, unknown>;
  attachments?: {
    filename: string;
    content: Buffer | string;
    contentType: string;
  }[];
}

/**
 * Resolved from the process working directory rather than `__dirname`, because
 * the two run modes put the templates in different places:
 *
 *   - Compiled (`node dist/server.js`): the image copies them to
 *     `dist/templates`, so the build output is self-contained.
 *   - Local dev (`tsx src/server.ts`): there is no `dist/`, so they are only
 *     in `src/templates`.
 *
 * Both are checked so neither mode has to know about the other. If neither
 * exists the `dist` path is returned, so ejs reports the missing file with the
 * path it expected rather than this function silently succeeding.
 */
function templatePath(template: string): string {
  const file = `${template}.ejs`;
  const candidates = [
    path.resolve(process.cwd(), 'dist', 'templates', file),
    path.resolve(process.cwd(), 'src', 'templates', file),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}

export const sendEmail = async ({
  to,
  subject,
  template,
  templateData,
  attachments,
}: ISendEmailOptions) => {
  try {
    const html = await ejs.renderFile(templatePath(template), templateData);

    return await transporter.sendMail({
      from: env.emailSender.from,
      to,
      subject,
      html,
      attachments: attachments?.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    // This project's AppError takes (message, statusCode), not (status, message).
    throw new AppError(`Failed to send email: ${message}`, 400);
  }
};

/**
 * Fire-and-forget wrapper for notifications that must never fail the caller's
 * response, such as credentials mail after an account is already created.
 */
export const sendEmailSafely = async (options: ISendEmailOptions): Promise<boolean> => {
  try {
    await sendEmail(options);
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Email "${options.template}" to ${options.to} failed: ${message}`);
    return false;
  }
};
