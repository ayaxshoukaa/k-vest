---
name: K-vest AI scope
description: Product scope, build cadence, and financial-data boundaries for the Kuwait investing website.
---

K-vest AI is a beginner-friendly guided journey for investing education in Kuwait: Scan, Research with AI, Practice with a demo 1,000 KD wallet, and ROI calculator. GCC expansion remains future vision.

Give the user brief step-by-step progress updates while completing the requested scope. When they ask to complete a connected experience in one pass, finish it without pausing for confirmation after every screen.

Use the attached futuristic wealth-platform design as inspiration across the full website, including sign-in, startup, company research, and learning screens. Keep the K-vest name and education-first positioning.

**Why:** the user asked to change the full website design to match the attached reference, including recoloring the logo.

**How to apply:** use obsidian surfaces, frosted charcoal panels, emerald actions, cyan accents, and Syne / Plus Jakarta Sans / Space Grotesk typography. Do not import the reference brand or its unsupported institutional claims and telemetry.

**Why:** the user asked to complete the journey in one pass while providing step-by-step updates.

**How to apply:** keep progress updates concise and continue through the connected scope unless a real ambiguity or risk needs user input.

Keep the Get started screen minimal, without welcome prose or milestone cards.

**Why:** the user asked to “remove all the extra writing leave only the get started page.”

**How to apply:** do not reintroduce marketing copy or a journey overview on that screen.

The entry flow is sign-in or an explicit Continue as guest choice, followed by the minimal Start learning screen and guided journey. Do not show the old marketing homepage or account-ready interstitial.

**Why:** the user wants users to sign in on arrival but later explicitly asked to retain the Continue as a guest option.

**How to apply:** keep journey access behind either a Clerk account or an explicit browser guest choice; never treat a client-selected owner as identity. Keep guest and account progress separate, and do not delete guest data when simplifying the visible flow.

Company analysis and saved AI research use the user's own OpenRouter API key directly on the backend; do not route them through managed AI integrations.

**Why:** the user chose to replace Gemini with their own OpenRouter API key.

**How to apply:** read `OPENROUTER_API_KEY` only from Replit Secrets on the API server, never expose it to the Vite client or logs, and preserve explicit stale/sample-data disclosures in AI answers.

The attached journey specification mentions MongoDB, but the project's actual `replit.md` specifies React/Vite, Express, PostgreSQL, and Drizzle. Follow `replit.md`; do not migrate storage or authentication as part of a screen-level feature.

**Why:** the user asked to follow the project's `replit.md` stack, which differs from the MongoDB note in the pasted feature specification.

**How to apply:** use the current Postgres/Drizzle and Clerk setup for incremental work. Ask before replacing the database or authentication architecture.

For the private educational class demo, keep Oanor as the primary scanner and index source, with delayed Yahoo Finance `.KW` quotes as the verified fallback for learning-stock rows and Yahoo Finance history fetched via `yahoo-finance2` on the backend only. When Oanor fails, omit its unavailable index rather than display an old value. Cache briefly; use clearly marked last-good or published sample fallbacks, and never invent a price. Before any public or commercial launch, switch market data to a licensed provider through Boursa Kuwait.

**Why:** the user clarified this is a private class demonstration and chose Oanor quotes plus Yahoo Finance history for the scanner. Oanor returned HTTP 402, while Yahoo Finance provided verified delayed quotes for all 11 learning stocks; Yahoo is therefore the fallback, not the primary source.

**How to apply:** keep Oanor credentials and Yahoo requests server-side. Yahoo returns Kuwait prices in KWF (fils); normalize by 1,000 to KWD. Distinguish Oanor, delayed Yahoo, stale, and sample data; disclose source, delay, and educational purpose. Preserve last-good values if refreshes fail and use a licensed vendor before public or commercial use.

The ROI calculator's Low / Medium / High label describes the size of the user's assumed target-price move, not the actual investment risk of a company.

**Why:** quote and price-history data alone are insufficient to assess company risk; an educational scenario must not imply a verified risk assessment or personal recommendation.

**How to apply:** label this as a target-move heuristic and explain the limitation wherever it appears. Do not turn the label into a buy/sell recommendation.

The Daily News page uses broader Yahoo Finance market headlines when Kuwait-specific searches return no results. Label broader coverage as not Kuwait-specific and link each headline to its original publisher.

**Why:** the user chose broader Yahoo Finance headlines after live searches returned no Kuwait-related stories.

**How to apply:** keep news fetching on the backend, cache briefly, label stale data clearly, and never present unrelated headlines as Kuwait news or invent fallback articles.
