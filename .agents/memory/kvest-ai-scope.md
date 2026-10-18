---
name: K-vest AI scope
description: Product scope, build cadence, and financial-data boundaries for the Kuwait investing website.
---

K-vest AI is an investing intelligence and education website for beginner investors in Kuwait, with active retail investors as a secondary audience. The MVP is limited to a Kuwait stock scanner, stock analysis, a KWD investment calculator, ratings, and a watchlist. GCC expansion is future vision, not current scope.

Build one feature fully before moving to the next. Keep increments small and explain each change. Do not add features outside the MVP.

The user proposed `yfinance` for market data. Yahoo Finance has Kuwait-listed symbols such as KFH.KW and BOURSA.KW, but yfinance describes the Yahoo API as personal-use-only, and Yahoo prohibits redistribution of its information. Do not use yfinance to serve data publicly unless the relevant rights are confirmed; it may be suitable for a private prototype.

**Why:** the user supplied these constraints and the yfinance proposal as project direction; following them avoids scope creep and unsupported market claims.

**How to apply:** implement and explain one MVP feature per increment. Before connecting a public scanner to yfinance, confirm the intended usage rights or switch to a Boursa Kuwait-authorized data vendor. Never imply market data is real-time unless the provider explicitly guarantees that.
