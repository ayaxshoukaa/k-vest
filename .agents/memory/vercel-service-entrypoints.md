---
name: Vercel service entrypoints
description: Vercel multi-service deployments validate each service entrypoint against repository files.
---

For Vercel multi-service projects, configure each service entrypoint to an existing source file tracked in Git. Do not point it at generated build output that is excluded by `.gitignore`.

**Why:** Vercel can reject a service with `ENTRYPOINT_NOT_FOUND` before running its build command, so a locally generated `dist` file does not satisfy entrypoint validation.

**How to apply:** Use the service's source entrypoint relative to its configured root; keep its build command responsible for generating runtime output.

For Express services, allow a default port when `PORT` is unset; Vercel's Express deployment examples use a fixed default port.

**Why:** The Replit artifact workflow injects `PORT`, but the Vercel runtime may not; throwing during startup makes every API route fail.

**How to apply:** Prefer `process.env.PORT ?? "3000"` before validating the parsed port.

Ensure runtime dependencies externalized by esbuild are installed in the Vercel service runtime; otherwise bundle them into the service output.

**Why:** The deployed API failed with `ERR_MODULE_NOT_FOUND` for the externalized MongoDB driver, even though it was declared in the workspace package.

**How to apply:** Review esbuild's `external` list for required runtime packages and confirm each external package is present in the deployment artifact.
