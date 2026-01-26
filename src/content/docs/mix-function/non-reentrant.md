---
title: Non Reentrant
description: How to prevent Cubit methods from being called more than once simultaneously.
sidebar:
  order: 6
---

To prevent a Cubit method from being called more than once simultaneously,
simply add the `nonReentrant` parameter to the `mix` function, with value `nonReentrant`:

```dart
void loadData() {
  mix(
    key: this,
    nonReentrant: nonReentrant,
    ...
```

This is similar to the `droppable()` EventTransformer from the `bloc_concurrency` package,
but for Cubit methods.

In the example above,
if you call `loadData` multiple times before the first call completes,
the subsequent calls will be aborted and return immediately without executing.

### Combining non-reentrant with retry

It's very common to combine `nonReentrant` with `retry`:

```dart
void loadData() {
  mix(
    key: this,
    retry: retry,
    nonReentrant: nonReentrant,
    ...
```
