import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { authenticateFirebaseRequest } from "./firebaseAuth";
import { logger } from "./logger";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await authenticateFirebaseRequest(opts.req);
  } catch (error) {
    // A Bearer token was presented but failed verification (expired,
    // revoked, malformed). Authentication is optional for public
    // procedures, so this simply falls back to an anonymous request.
    logger.warn("auth-firebase-token-verification-failed", {
      error:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : error,
    });
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
