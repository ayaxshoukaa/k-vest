---
name: Vercel service entrypoints
description: Vercel multi-service deployments validate each service entrypoint against repository files.
---

For Vercel multi-service projects, configure each service entrypoint to an existing source file tracked in Git. Do not point it at generated build output that is excluded by `.gitignore`.

**Why:** Vercel can reject a service with `ENTRYPOINT_NOT_FOUND` before running its build command, so a locally generated `dist` file does not satisfy entrypoint validation.

**How to apply:** Use the service's source entrypoint relative to its configured root; keep its build command responsible for generating runtime output.
