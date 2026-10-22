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

For `yahoo-finance2` under Vercel, use the namespace's explicit default export when the builder resolves the package's CommonJS branch.

**Why:** Vercel's TypeScript build treated the package namespace as the default import and rejected it as a constructor, although the local typecheck accepted the default import.

**How to apply:** Import the package as a namespace and instantiate its `.default` export; this also preserves the package's inferred quote result types.

Ensure runtime dependencies externalized by esbuild are installed in the Vercel service runtime; otherwise bundle them into the service output.

**Why:** The deployed API failed with `ERR_MODULE_NOT_FOUND` for the externalized MongoDB driver, even though it was declared in the workspace package.

**How to apply:** Review esbuild's `external` list for required runtime packages and confirm each external package is present in the deployment artifact.

For Vercel's TypeScript build, prefer named imports for CommonJS packages whose default import can resolve as a non-callable module namespace (for example, `pino-http`).

**Why:** Vercel's compiler reported that the `pino-http` default import had no call signatures even though the local workspace typecheck passed.

**How to apply:** When Vercel rejects a default import as non-callable, verify the package's declared named exports and import the callable by name; keep route parameter types explicit if Vercel reports emit/type errors.

Standalone Vercel API builds should resolve shared workspace packages through built JavaScript and declarations, not source TypeScript outside the service root.

**Why:** Generating declarations alone did not stop Vercel's isolated TypeScript pass from reporting `Emit skipped` because the workspace package still exported its `.ts` source.

**How to apply:** Build project-reference declarations and runtime JS before the API bundle, and point the package's `types`/`import` exports at those generated files.

K-Vest deployment decision: the user chose to deploy the website and API as separate Vercel projects rather than as one multi-service project.

**Why:** The user wants to keep the website deployment separate and deploy the API independently.

**How to apply:** Configure the frontend with the deployed API origin and allow only the website's exact origin in the API. Verify guest-session cookies across the two origins because browser third-party-cookie policies can affect guest progress.
