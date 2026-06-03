/**
 * Base URL for OpenAPI "servers" — works behind Render / reverse proxies.
 */
export function resolveSwaggerServerUrl(req) {
  const explicit =
    process.env.SWAGGER_SERVER_URL ||
    process.env.APP_URL ||
    process.env.BASE_URL ||
    process.env.PUBLIC_URL ||
    process.env.RENDER_EXTERNAL_URL;

  if (explicit) {
    return String(explicit).replace(/\/$/, "");
  }

  const xfProto = req.get("x-forwarded-proto");
  const proto =
    (xfProto && xfProto.split(",")[0].trim()) || req.protocol || "http";
  const xfHost = req.get("x-forwarded-host");
  const host =
    (xfHost && xfHost.split(",")[0].trim()) || req.get("host") || "localhost:5006";

  return `${proto}://${host}`;
}
