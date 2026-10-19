---
name: K-vest AI scope
description: Product scope, build cadence, and financial-data boundaries for the Kuwait investing website.
---

K-vest AI is a beginner-friendly guided journey for investing education in Kuwait: Scan, Research with AI, Practice with a demo 1,000 KD wallet, and ROI calculator. GCC expansion remains future vision.

Build one screen or feature at a time, explain each change briefly, and stop for the user to test before moving to the next. Do not implement the whole journey in one pass.

Preserve the current K-vest AI visual design when implementing features; do not restyle existing pages unless the user explicitly asks.

**Why:** the user asked to keep the website's existing design unchanged.

**How to apply:** reuse the existing colors, typography, and components. Keep feature work scoped to the requested screen or interaction.

The attached journey specification mentions MongoDB, but the project's actual `replit.md` specifies React/Vite, Express, PostgreSQL, and Drizzle. Follow `replit.md`; do not migrate storage or authentication as part of a screen-level feature.

**Why:** the user asked to follow the project's `replit.md` stack, which differs from the MongoDB note in the pasted feature specification.

**How to apply:** use the current Postgres/Drizzle and Clerk setup for incremental work. Ask before replacing the database or authentication architecture.

For the private educational class demo, keep the homepage quote preview on Yahoo Finance and use Oanor for the scanner, index, and current quotes, with Yahoo Finance history fetched via `yahoo-finance2` on the backend only. Cache briefly; use clearly marked last-good or published sample fallbacks, and never invent a price. Before any public or commercial launch, switch market data to a licensed provider through Boursa Kuwait.

**Why:** the user clarified this is a private class demonstration and chose Oanor quotes plus Yahoo Finance history for the scanner, with a future move to licensed data through Boursa Kuwait.

**How to apply:** keep Oanor credentials and Yahoo requests server-side. Yahoo returns Kuwait prices in KWF (fils); normalize by 1,000 to KWD. Distinguish live, stale, and sample data; disclose source, delay, and educational purpose. Preserve last-good values if refreshes fail and use a licensed vendor before public or commercial use.
