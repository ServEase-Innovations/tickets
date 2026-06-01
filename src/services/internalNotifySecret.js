import config, { DEV_ADMIN_SECRET } from "../config/env.js";

/** Secret sent to payments internal notify routes (must match payments resolver). */
export function getInternalNotifySecret() {
  const fromEnv = (
    process.env.INTERNAL_NOTIFY_SECRET ||
    config.adminSecret ||
    process.env.ADMIN_PUSH_SECRET ||
    ""
  ).trim();
  if (fromEnv) return fromEnv;
  if ((process.env.NODE_ENV || "development") === "development") {
    return DEV_ADMIN_SECRET;
  }
  return "";
}
