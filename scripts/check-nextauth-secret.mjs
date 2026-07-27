#!/usr/bin/env node
/**
 * Vérifie NEXTAUTH_SECRET (CI / déploiement).
 * 32 caractères minimum.
 */
import { getLogger } from "./lib/logger.mjs";

const log = getLogger("check-nextauth-secret");
const secret = process.env.NEXTAUTH_SECRET?.trim();
const requireSecret =
  process.env.CI === "true" || process.env.NODE_ENV === "production";

if (!secret) {
  if (requireSecret) {
    log.error({
      msg: "NEXTAUTH_SECRET doit être défini (CI ou production)",
      hint: "openssl rand -base64 32",
    });
    process.exit(1);
  }
  process.exit(0);
}

if (secret.length < 32) {
  log.error({
    msg: "NEXTAUTH_SECRET trop court",
    minLength: 32,
    hint: "openssl rand -base64 32",
  });
  process.exit(1);
}
