---
title: Throttle
description: How to throttle Cubit method calls to limit how often they can be called.
sidebar:
  order: 10
---

The `throttle` parameter rate-limits execution of a method. The first call executes
immediately and sets a lock; subsequent calls with the same key are aborted until the
throttle period expires.

Throttling is useful when you want to limit how often a method can be called, such as
for refresh buttons, scroll handlers, or API polling.

### Basic usage

```dart
class DataCubit extends Cubit<DataState> {
  DataCubit() : super(DataState());

  void refresh() {
    mix(
      key: this,
      throttle: throttle, // Only allow refresh every 1 second at most
      () async {
        var data = await api.fetchData();
        emit(state.copyWith(data: data));
      }
    );
  }
}
```

In this example, if the user taps the refresh button multiple times quickly, only the
first tap executes. Subsequent taps within 1 second are ignored.

### Configuring the throttle duration

The `duration` value is a `Duration`. The default is 1 second.
You can change the duration as needed:

```dart
// Throttle to once every 5 seconds
throttle: throttle(duration: 5.sec),

// Throttle to once every 500ms
throttle: throttle(duration: 500.millis),
```

### How throttle keys work

By default, when you pass `key: this` to `mix`, the key is the Cubit's `runtimeType`.
This means all calls from the same Cubit type share the same throttle period.

If you want different throttle periods for different parameters, use a record as the key:

```dart
class FeedCubit extends Cubit<FeedState> {
  FeedCubit() : super(FeedState());

  void refreshFeed(String feedId) {
    mix(
      key: this,

      // Each feed has its own throttle period
      throttle: throttle(key: (FeedCubit, feedId)),

      () async {
        var posts = await api.fetchFeed(feedId);
        emit(state.copyWith(feeds: {...state.feeds, feedId: posts}));
      }
    );
  }
}
```

Now refreshing the "news" feed and "sports" feed won't interfere with each other's
throttle timers.

### Allowing calls after failure

By default, if a throttled method fails, the lock remains in place until the throttle
period expires. This prevents rapid calls that might overwhelm a failing server.

If you want to allow immediate calls after failure, set `removeLockOnError: true`:

```dart
void submitForm() {
  mix(
    key: this,
    throttle: throttle(duration: 3.sec, removeLockOnError: true),
    () async {
      await api.submitForm(data);
    }
  );
}
```

With this setup:

* If the submission succeeds, subsequent calls are throttled for 3 seconds.
* If the submission fails, the lock is removed and the user can retry immediately.

### Forcing execution

Sometimes you want to bypass the throttle and execute immediately.
For that, set `ignoreThrottle: true`:

```dart
void refresh({bool force = false}) {
  mix(
    key: this,
    throttle: throttle(ignoreThrottle: force), // Here!
    () async {
      var data = await api.fetchData();
      emit(state.copyWith(data: data));
    }
  );
}
```

With this setup:

* `refresh()` respects the throttle period.
* `refresh(force: true)` executes immediately and resets the throttle timer.

### Manually clearing throttle locks

You can also control throttle locks programmatically:

* Call `removeThrottleLock(key)` to remove a specific lock, so the next call
  for that key can run immediately.

* Call `removeAllThrottleLocks()` to clear all locks. This is useful during
  logout or similar scenarios.

```dart
// User explicitly requested refresh - allow it immediately
void onPullToRefresh() {
  removeThrottleLock(DataCubit);
  refresh();
}
```

Expired locks are cleaned automatically over time,
so you usually do not need to worry about old entries.

### How it differs from debounce

**Throttle** rate-limits execution:

- If you call a method 10 times in quick succession, only the **first** call executes,
  and subsequent calls are ignored until the throttle period expires.
- Use throttle for scroll handlers, refresh buttons, API polling.

**Debounce** waits for quiet time:

- If you call a method 10 times in quick succession, only the **last** call executes,
  after the quiet period.
- Use debounce for search-as-you-type, form validation, window resize handlers.

### How it differs from fresh

**Throttle** tracks when the action *started*:

- The lock is set immediately when the method begins.
- Useful for rate-limiting user interactions.

**Fresh** tracks when the *result* becomes stale:

- The expiry is set when the method completes successfully.
- If the method fails, freshness is rolled back.
- Useful for caching data that doesn't need to be reloaded.

### Combining throttle with other parameters

Throttle is often combined with `retry` for robustness:

```dart
void syncData() {
  mix(
    key: this,
    throttle: throttle(duration: 5.sec, removeLockOnError: true),
    retry: retry,
    () async {
      await api.syncData();
    }
  );
}
```
