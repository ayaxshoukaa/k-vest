---
name: K-vest AI scope
description: Product scope, build cadence, and financial-data boundaries for the Kuwait investing website.
---

K-vest AI is an investing intelligence and education website for beginner investors in Kuwait, with active retail investors as a secondary audience. The MVP is limited to a Kuwait stock scanner, stock analysis, a KWD investment calculator, ratings, and a watchlist. GCC expansion is future vision, not current scope.

Build one feature fully before moving to the next. Keep increments small and explain each change. Do not add features outside the MVP.

Preserve the current K-vest AI visual design when implementing features; do not restyle existing pages unless the user explicitly asks.

**Why:** the user asked to keep the website's existing design unchanged.

**How to apply:** reuse the existing colors, typography, and components. Keep feature work scoped to the requested screen or interaction.

For the private educational class demo, use Yahoo Finance through `yahoo-finance2` on the backend only for Kuwait `.KW` quotes. Cache briefly and use the last successful quote as a clearly marked stale fallback; never invent a price. Show the requested delayed/educational note. Before any public or commercial launch, switch to a licensed provider through Boursa Kuwait.

**Why:** the user clarified this is a private class demonstration and explicitly chose Yahoo Finance for the prototype, with a future move to licensed data.

**How to apply:** keep Yahoo Finance server-side and scope it to the demo. Yahoo returns Kuwait prices in KWF (fils); normalize by 1,000 to KWD. Display the source, delay, and educational purpose; preserve stale last-good values if refreshes fail. Use a licensed vendor before making market data public or commercial.
