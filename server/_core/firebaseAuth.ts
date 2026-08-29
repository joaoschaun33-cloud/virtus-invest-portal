import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { roleForConfiguredAdmin } from "../adminAccess";

const firebaseApp =
  getApps()[0] ??
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT || "portal-virtus",
  });

export async function authenticateFirebaseRequest(
  req: Request
): Promise<User | null> {
  const authorization = req.header("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();
  if (!token) return null;

  const decoded = await getAuth(firebaseApp).verifyIdToken(token, true);
  const provider = decoded.firebase?.sign_in_provider ?? "firebase";
  const email = decoded.email ?? null;
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  await db.upsertUser({
    openId: decoded.uid,
    name: decoded.name ?? null,
    email,
    loginMethod: provider,
    lastSignedIn: new Date(),
    // Production has one configured administrator. Supplying "user" here also
    // removes stale admin privileges from an address that is no longer configured.
    role: roleForConfiguredAdmin(email, adminEmail),
  });

  return (await db.getUserByOpenId(decoded.uid)) ?? null;
}

export async function deleteFirebaseUser(uid: string) {
  await getAuth(firebaseApp).deleteUser(uid);
}
