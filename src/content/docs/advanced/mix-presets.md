---
title: Mix presets
description: How to create reusable, callable configurations for mix using MixPreset.
sidebar:
  order: 18
---

`MixPreset` allows you to create reusable, callable configurations for `mix`. Instead of
repeating the same parameters across many `mix` calls, define them once in a preset
and invoke the preset like a function.

### Basic usage

```dart
// Define presets for different use cases
const apiCall = MixPreset(
  retry: retry,
  checkInternet: checkInternet,
);

const backgroundSync = MixPreset(
  checkInternet: checkInternet(abortSilently: true),
  nonReentrant: nonReentrant,
);

// Use the preset - retry and checkInternet come from preset
await apiCall(
  key: 'fetchUser',
  () async {
    return await api.fetchUser();
  },
);
```

### Overriding preset values

Explicit parameters passed at call time override the preset values:

```dart
const apiCall = MixPreset(
  retry: retry(maxRetries: 3),
  checkInternet: checkInternet,
);

// Override retry for this specific call
await apiCall(
  key: 'fetchCritical',
  retry: retry.unlimited,  // Overrides the preset's maxRetries: 3
  () async {
    return await api.fetchCritical();
  },
);
```

### Resolution order

Configuration values are resolved in this order (highest priority last):

1. **Built-in defaults** (e.g., `RetryConfig.defaults`)
2. **Preset values** (stored in `MixPreset`)
3. **Explicit parameters** (passed when calling the preset)

### Default key

You can set a default key in the preset to avoid passing it every time:

```dart
const userPreset = MixPreset(
  key: UserCubit,  // Default key
  retry: retry,
);

// No need to pass key at call time
await userPreset(() async {
  return await api.fetchUser();
});

// But you can override it if needed
await userPreset(
  key: 'specificOperation',
  () async { ... },
);
```

If no default key is set, the `key` parameter is required at call time.

### Using preset with context

Use the `ctx` method to access runtime information like retry attempt number:

```dart
const myPreset = MixPreset(retry: retry(maxRetries: 3));

await myPreset.ctx(
  key: 'fetchData',
  (ctx) async {
    print('Attempt ${ctx.retry!.attempt + 1} of ${ctx.retry!.config.maxRetries + 1}');
    return await api.fetchData();
  },
);
```

### Callbacks in presets

Presets can include `before`, `after`, `wrapRun`, and `catchError` callbacks:

```dart
const loggingPreset = MixPreset(
  retry: retry,
  before: () => print('Starting...'),
  after: () => print('Done!'),
  catchError: (error, stackTrace) {
    logError(error);
    throw UserException('Operation failed').addCause(error);
  },
);

// Usage:
loggingPreset(
  key: 'loadItems',
  () async {
    return await api.loadItems();
  },
);
```

### Alternative factory function

This is another way to use presets, with a factory function.
It logs when the action starts, when it completes successfully, and when it fails:

```dart
/// Creates a preset that logs the lifecycle of an action.
MixPreset runLogged(Object key) => MixPreset(
  key: key,
  wrapRun: (action) async {
    print('[$key] Starting...');
    try {
      final result = await action();
      print('[$key] Completed successfully');
      return result;
    } catch (e) {
      print('[$key] Failed: $e');
      rethrow;
    }
  },
);

// Usage:
await runLogged('fetchUser')(() async {
  return await api.fetchUser();
});
```
