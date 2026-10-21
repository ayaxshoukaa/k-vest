---
name: MongoDB driver v7 IDs
description: TypeScript typing for MongoDB collections that use string keys.
---

When using this workspace's MongoDB driver v7, `Collection<TSchema>` takes one schema generic. For collections with string `_id` values, declare `_id: string` directly on the document type; do not pass a second ID generic.

**Why:** the v7 TypeScript declarations reject the older two-generic collection pattern, and otherwise infer `_id` as `ObjectId`.

**How to apply:** explicitly type string-keyed caches, counters, and migration records so filters and writes accept the string identifier.
