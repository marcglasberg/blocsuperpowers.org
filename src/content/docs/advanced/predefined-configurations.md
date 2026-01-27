---
title: Predefined configurations
description: How to create reusable MixConfig configurations for the mix function.
sidebar:
  order: 11
---

When you have multiple `mix` calls that share the same configuration, you can use
the `config` parameter with `MixConfig` to avoid repetition and ensure consistency.

### Basic usage

Create a reusable configuration:

```dart         
// Define once
const checkInternetRetryAndLog = MixConfig(
  retry: retry(maxRetries: 5, initialDelay: 1.sec),
  checkInternet: checkInternet,
  before: () => Log.info("Starting"),
  after: () => Log.info("Finished"),
  catchError: (error, stackTrace) => Log.error("Failed", error),
);

// Use everywhere
void fetchUsers() {
  mix(
    key: this,
    config: checkInternetRetryAndLog, // Here!
    () async {
      final users = await api.getUsers();
      emit(state.copyWith(users: users));
    },
  );
}
```

### Available configuration options

`MixConfig` supports all the same parameters as `mix`:

```dart
const myConfig = MixConfig(
  // Feature configurations
  retry: retry(...),
  checkInternet: checkInternet(...),
  nonReentrant: nonReentrant(...),
  throttle: throttle(...),
  debounce: debounce(...),
  fresh: fresh(...),
  sequential: sequential(...),

  // Callbacks
  before: () { ... },      // Called once before the first attempt
  after: () { ... },       // Called once after all attempts complete
  wrapRun: (action) { ... }, // Wraps each execution of the action
  catchError: (error, stack) { ... }, // Handle errors
);
```

### Resolution order

Configuration values are resolved in this order (highest priority last):

1. **Built-in defaults** (e.g., `RetryConfig.defaults`)
2. **Config parameter** (`config: myConfig`)
3. **Explicit parameters** (e.g., `retry: retry(...)`)

This means you can define base configurations and override specific values per-call:

```dart
const serverCallConfig = MixConfig(
  retry: retry(maxRetries: 5, multiplier: 3.0),
);

// Uses config's maxRetries=5 and multiplier=3.0
void normalCall() {
  mix(
    key: this,
    config: serverCallConfig,
    () async { ... },
  );
}

// Overrides maxRetries to 10, but keeps multiplier=3.0 from config
void importantCall() {
  mix(
    key: this,
    config: serverCallConfig,
    retry: retry(maxRetries: 10),
    () async { ... },
  );
}
```

### Customizing defaults globally

Each config class has a static `defaults` property you can customize at app startup:

```dart
void main() {
  // Customize defaults for your app
  RetryConfig.defaults = retry(
    maxRetries: 5,
    initialDelay: Duration(milliseconds: 200),
    multiplier: 2.0,
    maxDelay: Duration(seconds: 10),
  );

  ThrottleConfig.defaults = throttle(
    duration: Duration(seconds: 1),
    removeLockOnError: false,
    ignoreThrottle: false,
  );

  runApp(MyApp());
}
```

Now any `MixConfig` or explicit parameter that doesn't specify a value will use your
custom defaults instead of the built-in ones.
