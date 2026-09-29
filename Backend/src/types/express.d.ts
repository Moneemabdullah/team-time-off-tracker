import type { UserRole } from '../models/user.model';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by `requireAuth`. Optional in the type so routes that skip the
       *  middleware cannot silently assume it is present; use `getAuthUser`. */
      user?: {
        id: string;
        role: UserRole;
      };
    }
  }
}

export {};
