export function getRequestAuditMeta(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const url = new URL(request.url);
  const ip =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    null;

  return {
    ip,
    requestMethod: request.method,
    requestPath: url.pathname,
    userAgent: request.headers.get("user-agent"),
  };
}
