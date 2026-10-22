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

For `yahoo-finance2` under Vercel, the namespace's `.default` may need an explicit constructor type contract.

**Why:** Vercel still reported `TS2351` after accessing `.default`, even though the runtime value is a constructor and local TypeScript accepts the package declaration.

**How to apply:** Import the package as a namespace, cast `.default` to a constructor with an explicit client method/result interface, and avoid leaving callback results as `any`.

Ensure runtime dependencies externalized by esbuild are installed in the Vercel service runtime; otherwise bundle them into the service output.

**Why:** The deployed API failed with `ERR_MODULE_NOT_FOUND` for the externalized MongoDB driver, even though it was declared in the workspace package.

**How to apply:** Review esbuild's `external` list for required runtime packages and confirm each external package is present in the deployment artifact.

For Vercel's TypeScript build, prefer named imports for CommonJS packages whose default import can resolve as a non-callable module namespace (for example, `pino-http`).

**Why:** Vercel's compiler reported that the `pino-http` default import had no call signatures even though the local workspace typecheck passed.

**How to apply:** When Vercel rejects a default import as non-callable, verify the package's declared named exports and import the callable by name; keep route parameter types explicit if Vercel reports emit/type errors.

Standalone Vercel API builds should resolve shared workspace packages through built JavaScript and declarations, not source TypeScript outside the service root.

**Why:** Generating declarations alone did not stop Vercel's isolated TypeScript pass from reporting `Emit skipped` because the workspace package still exported its `.ts` source.

**How to apply:** Build project-reference declarations and runtime JS before the API bundle, and point the package's `types`/`import` exports at those generated files.

K-Vest deployment decision: keep the website and API in the single `k-vest` Vercel project using the repository-root multi-service configuration; the separate API project was deleted.

**Why:** The user asked to fix the website after deleting the separate API project.

**How to apply:** Set the Vercel project root to the repository root, keep frontend API calls same-origin at `/api`, and ensure API runtime variables are configured on the `k-vest` project.
