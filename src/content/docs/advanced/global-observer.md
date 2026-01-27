---
title: Global observer
description: Set up a global observer to track all mix calls in your application.
sidebar:
  order: 101
---

You can set up an observer to watch all `mix` calls in your app.
The observer is called twice for each `mix` call: once when it starts, and once when it ends.

This is useful for:

- **Performance tracking**: Measure how long each operation takes.
- **Analytics**: Log when actions start and finish.
- **Debugging**: See what's happening in your app.
- **Monitoring**: Track errors and their frequency.

### Setting up the observer

Set `Superpowers.observer` to a function that receives information about each `mix` call:

```dart
void main() {
  Superpowers.observer = (
    bool isStart,
    Object key,
    Object? metrics,
    Object? error,
    StackTrace? stackTrace,
    Duration? duration,
  ) {
    // Your code here
  };

  runApp(Superpowers(child: MaterialApp(...)));
}
```

### What the observer receives

The observer receives six pieces of information:

| Parameter    | Description                                                                                        |
|--------------|----------------------------------------------------------------------------------------------------|
| `isStart`    | `true` when the `mix` call starts, `false` when it ends.                                           |
| `key`        | The key you passed to `mix`. For example: `UserCubit`, `'loadData'`, or `(UserCubit, userId)`.     |
| `metrics`    | Custom data you provide (explained below). Can be `null`.                                          |
| `error`      | The error that occurred, or `null` if the operation succeeded. Only set when `isStart` is `false`. |
| `stackTrace` | The stack trace of the error, or `null` if no error. Only set when `isStart` is `false`.           |
| `duration`   | How long the operation took. Only set when `isStart` is `false`.                                   |

### Basic example: Logging start and end

Here is a simple observer that logs when operations start and end:

```dart
Superpowers.observer = (isStart, key, metrics, error, stackTrace, duration) {
  if (isStart) {
    print('Starting: $key');
  } else {
    if (error != null) {
      print('Failed: $key after ${duration?.inMilliseconds}ms - $error');
    } else {
      print('Finished: $key in ${duration?.inMilliseconds}ms');
    }
  }
};
```

When you call a Cubit method wrapped with `mix`:

```dart
class UserCubit extends Cubit<User> {
  void loadUser() => mix(
    key: this,
    () async {
      await Future.delayed(Duration(seconds: 1));
      emit(User('John'));
    },
  );
}
```

The output would be:

```
Starting: UserCubit
Finished: UserCubit in 1003ms
```

### Tracking performance

You can collect timing data to find slow operations:

```dart
final performanceData = <String, List<int>>{};

Superpowers.observer = (isStart, key, metrics, error, stackTrace, duration) {
  if (!isStart && duration != null) {
    final keyName = key.toString();
    performanceData.putIfAbsent(keyName, () => []);
    performanceData[keyName]!.add(duration.inMilliseconds);
  }
};
```

Later, you can analyze which operations are slow:

```dart
void printPerformanceReport() {
  for (final entry in performanceData.entries) {
    final times = entry.value;
    final average = times.reduce((a, b) => a + b) / times.length;
    print('${entry.key}: avg ${average.toStringAsFixed(1)}ms (${times.length} calls)');
  }
}
```

### Using the metrics parameter

The `metrics` parameter lets you pass custom data to the observer.

For example, you might want to see the current state of your Cubit when an operation starts and ends.
You can do this by providing a `metrics` callback that returns any data you want:

```dart
class CounterCubit extends Cubit<int> {
  CounterCubit() : super(0);

  void increment() => mix(
    key: this,
    metrics: () => state, // Pass the current counter value
    () async {
      await Future.delayed(Duration(milliseconds: 100));
      emit(state + 1);
    },
  );
}
```

The observer receives this data:

```dart
Superpowers.observer = (isStart, key, metrics, error, stackTrace, duration) {
  if (isStart) {
    print('Counter is $metrics before increment');
  } else {
    print('Counter is $metrics after increment');
  }
};
```

Output:

```
Counter is 0 before increment
Counter is 1 after increment
```

The `metrics` callback is called twice: once at the start and once at the end.
This lets you see how the state changed during the operation.

### Passing the Cubit itself as metrics

A common pattern is to pass the Cubit instance itself as the metrics.
This gives the observer full access to the Cubit and its state:

```dart
class UserCubit extends Cubit<UserState> {
  void loadUser() => mix(
    key: this,
    metrics: () => this, // Pass the entire Cubit
    () async {
      final user = await api.getUser();
      emit(state.copyWith(user: user));
    },
  );
}
```

In the observer, you can now access all the Cubit's data:

```dart
Superpowers.observer = (isStart, key, metrics, error, stackTrace, duration) {
  if (metrics is UserCubit) {
    final cubit = metrics;
    print('User state: ${cubit.state}');
  }
};
```

### Metrics from MixConfig

If you use `MixConfig`, you can set the `metrics` callback there.
This way, all `mix` calls that use that config will have the same metrics:

```dart
class UserCubit extends Cubit<UserState> {

  final config = MixConfig(
    metrics: () => this,
  );

  void loadUser() => mix(
    key: this,
    config: config,
    () async { ... },
  );

  void saveUser() => mix(
    key: this,
    config: config,
    () async { ... },
  );
}
```

If you provide both a `config` with `metrics` and an explicit `metrics` parameter,
the explicit parameter takes priority.

### Error safety

If your `metrics` callback throws an error, the observer still works.
The error becomes the `metrics` value instead of crashing:

```dart
mix(
  key: this,
  metrics: () => throw Exception('oops'), // This won't crash your app
  () async { ... },
);
```

The observer receives the exception as the `metrics` value:

```dart
Superpowers.observer = (isStart, key, metrics, error, stackTrace, duration) {
  if (metrics is Exception) {
    print('Metrics callback failed: $metrics');
  }
};
```

Similarly, if the observer itself throws an error, it is silently caught.
Observer errors never affect your app's behavior.

### Integration with analytics services

You can send data to analytics services like Firebase, Amplitude, or custom backends:

```dart
Superpowers.observer = (isStart, key, metrics, error, stackTrace, duration) {
  if (!isStart) {
    analytics.track('cubit_action', {
      'action': key.toString(),
      'duration_ms': duration?.inMilliseconds,
      'success': error == null,
      'error': error?.toString(),
    });
  }
};
```

### Observer and retry

When you use `retry`, the observer is called only twice:
once at the very start, and once at the very end (after all retries).

The observer does **not** see each individual retry attempt.
This keeps the data clean and avoids flooding your logs.

```dart
mix(
  key: this,
  retry: retry(maxRetries: 3),
  () async {
    // Even if this fails 3 times, the observer only sees:
    // - One "start" call
    // - One "end" call (with the final error or success)
    throw Exception('always fails');
  },
);
```

If you need to track individual retry attempts, use the `onRetry` callback in the retry configuration instead:

```dart
mix(
  key: this,
  retry: retry(
    maxRetries: 3,
    onRetry: (attempt, delay, error, stack) {
      print('Retry attempt $attempt');
    },
  ),
  () async { ... },
);
```

### Clearing the observer

The observer is cleared when you call `Superpowers.clear()`:

```dart
Superpowers.clear(); // Also clears the observer
```

This is useful in tests to reset all state between tests.

### Complete example

Here is a complete example that tracks all operations and reports slow ones:

```dart
void main() {
  // Set up performance tracking
  Superpowers.observer = (isStart, key, metrics, error, stackTrace, duration) {
    if (!isStart) {
      // Log all completions
      final status = error != null ? 'FAILED' : 'OK';
      final ms = duration?.inMilliseconds ?? 0;
      print('[$status] $key completed in ${ms}ms');

      // Warn about slow operations (over 2 seconds)
      if (ms > 2000) {
        print('WARNING: $key is slow!');
      }

      // Track errors
      if (error != null) {
        errorTracker.report(error, stackTrace, {'key': key.toString()});
      }
    }
  };

  runApp(
    Superpowers(
      child: MaterialApp(
        home: MyApp(),
      ),
    ),
  );
}
```

### Summary

| Use case           | How to do it                                 |
|--------------------|----------------------------------------------|
| Log all operations | Check `isStart` and print the `key`          |
| Track performance  | Use `duration` when `isStart` is `false`     |
| Monitor errors     | Check if `error` is not `null`               |
| Access Cubit state | Use `metrics: () => this` in your `mix` call |
| Send to analytics  | Call your analytics service in the observer  |

The observer gives you a single place to see everything that happens in your app.
You can use it for debugging during development or for monitoring in production.
