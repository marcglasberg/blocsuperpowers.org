---
title: Mix presets with params
description: Advanced presets that inject parameters into every action for dependency injection.
sidebar:
  order: 19
---

`MixPreset.withUserContext<P, C>()` creates an advanced preset that injects parameters
into
every action. It's useful when you want to provide dependencies or utilities that the
action can use at runtime.

**Type parameters:**

- `P`: The type of params injected into the action (what the user receives)
- `C`: The type of config the user can pass at call time (optional)

### Basic usage

```dart
// Creator defines the preset with injected params
final apiCall = MixPreset.withUserContext<
    ({String baseUrl, void Function(String) log}),  // P - params type
    ({String env, bool verbose})                    // C - config type
  >(
  params: (ctx, config) => (
    baseUrl: config.env == 'prod'
        ? 'https://api.example.com'
        : 'https://staging.example.com',
    log: (msg) {
      if (config.verbose) {
        final attempt = ctx.retry?.attempt ?? 0;
        debugPrint('[API Attempt $attempt] $msg');
      }
    },
  ),
  defaultConfig: (env: 'dev', verbose: false),
  retry: retry,
  checkInternet: checkInternet,
);

// User provides config and action
await apiCall(
  key: 'fetchUsers',
  config: (env: 'prod', verbose: true),
  (ctx) async {
    ctx.log('Fetching users...');
    return await http.get('${ctx.baseUrl}/users');
  },
);

// Or use default config
await apiCall(
  key: 'fetchData',
  (ctx) async {
    return await http.get('${ctx.baseUrl}/data');
  },
);
```

### Params with retry context

The `params` function receives `MixContext`, so injected utilities can access retry
information. Params are rebuilt on each retry attempt with updated context:

```dart
final preset = MixPreset.withUserContext<
  ({void Function(String) log}),
  void
>(
  params: (ctx, _) => (
    log: (msg) {
      final attempt = ctx.retry?.attempt ?? 0;
      print('[$attempt] $msg');
    },
  ),
  retry: retry(maxRetries: 3),
);

await preset(
  key: 'work',
  config: null,
  (ctx) async {
    ctx.log('Working...');  // Prints "[0] Working...", "[1] Working...", etc.
    return await doWork();
  },
);
```

### catchError composition

If both the preset and the call site define `catchError`, they are composed:
the preset's `catchError` runs first.
If it returns normally (suppresses), the user's `catchError` is not called.
If it throws, the user's `catchError` receives the thrown error.

```dart
final preset = MixPreset.withUserContext<String, void>(
  params: (_, __) => 'url',
  catchError: (e, s) => throw UserException('API Error: $e'),  // Runs first
);

await preset(
  key: 'x',
  config: null,
  catchError: (e, s) {
    logError(e);  // Receives UserException from preset
    throw e;
  },
  (url) async => await fetch(url),
);
```

### When to use MixPreset.withParams() vs MixPreset

Use **MixPreset** when:

- You just want to bundle common configuration options
- Actions don't need injected dependencies

Use **MixPreset.withParams()** when:

- You want to inject utilities or services into actions
- Injected params need access to runtime context (retry attempts, etc.)
- You want to encapsulate complex setup logic
