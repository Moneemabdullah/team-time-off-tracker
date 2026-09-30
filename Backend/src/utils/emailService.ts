import ejs from 'ejs';
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
 * Resolved from the process working directory rather than `__dirname`: `tsc`
 * does not copy .ejs files into dist/, so a __dirname-relative path only works
 * under tsx. Works in Docker because the image copies `src` and uses WORKDIR /app.
 */
function templatePath(template: string): string {
  return path.resolve(process.cwd(), 'src', 'templates', `${template}.ejs`);
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
