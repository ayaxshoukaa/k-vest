---
name: K-vest AI scope
description: Product scope, build cadence, and financial-data boundaries for the Kuwait investing website.
---

K-vest AI is a beginner-friendly guided journey for investing education in Kuwait: Scan, Research with AI, Practice with a demo 1,000 KD wallet, and ROI calculator. GCC expansion remains future vision.

Build one screen or feature at a time, explain each change briefly, and stop for the user to test before moving to the next. Do not implement the whole journey in one pass.

Keep the existing home and sign-in designs unchanged; use the new mostly-white, deep-blue visual direction only on newly added journey screens.

**Why:** the user confirmed the new style should apply to journey screens only.

**How to apply:** do not restyle existing pages while building the journey; apply the new visual direction to each new screen.

The attached journey specification mentions MongoDB, but the project's actual `replit.md` specifies React/Vite, Express, PostgreSQL, and Drizzle. Follow `replit.md`; do not migrate storage or authentication as part of a screen-level feature.

**Why:** the user asked to follow the project's `replit.md` stack, which differs from the MongoDB note in the pasted feature specification.

**How to apply:** use the current Postgres/Drizzle and Clerk setup for incremental work. Ask before replacing the database or authentication architecture.

For the private educational class demo, keep the homepage quote preview on Yahoo Finance and use Oanor for the scanner, index, and current quotes, with Yahoo Finance history fetched via `yahoo-finance2` on the backend only. Cache briefly; use clearly marked last-good or published sample fallbacks, and never invent a price. Before any public or commercial launch, switch market data to a licensed provider through Boursa Kuwait.

**Why:** the user clarified this is a private class demonstration and chose Oanor quotes plus Yahoo Finance history for the scanner, with a future move to licensed data through Boursa Kuwait.

**How to apply:** keep Oanor credentials and Yahoo requests server-side. Yahoo returns Kuwait prices in KWF (fils); normalize by 1,000 to KWD. Distinguish live, stale, and sample data; disclose source, delay, and educational purpose. Preserve last-good values if refreshes fail and use a licensed vendor before public or commercial use.

The ROI calculator's Low / Medium / High label describes the size of the user's assumed target-price move, not the actual investment risk of a company.

**Why:** quote and price-history data alone are insufficient to assess company risk; an educational scenario must not imply a verified risk assessment or personal recommendation.

**How to apply:** label this as a target-move heuristic and explain the limitation wherever it appears. Do not turn the label into a buy/sell recommendation.
