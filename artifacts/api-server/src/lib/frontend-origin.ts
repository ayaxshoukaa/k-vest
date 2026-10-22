function parseOrigins(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
      .map((origin) => {
        try {
          return new URL(origin).origin;
        } catch {
          return "";
        }
      })
      .filter(Boolean),
  );
}

const allowedOrigins = parseOrigins(
  process.env.FRONTEND_ORIGINS ?? process.env.FRONTEND_ORIGIN,
);

export function isAllowedFrontendOrigin(origin: string): boolean {
  try {
    return allowedOrigins.has(new URL(origin).origin);
  } catch {
    return false;
  }
}
