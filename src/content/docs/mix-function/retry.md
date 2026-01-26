---
title: Retry
description: How to automatically retry failed Cubit methods with exponential backoff.
sidebar:
  order: 5
---

To retry a failed method, simply add a `retry` parameter to the `mix` function.

```dart
class UserCubit extends Cubit<User> {
  UserCubit() : super(User());

  void loadData() {
    mix(
      key: this,
      retry: retry, // Here!
      () async {
        var user = await api.loadUser();
        if (user == null) throw UserException('Failed to load user');
        emit(user);
      }
    );
  }
}
```

The default value is also called `retry`, so adding `retry: retry` will automatically
retry the method when it fails. The default parameters are:

* **maxRetries: 3** — The maximum number of retries before giving up. This means the
  method will try a total of 4 times (1 initial attempt + 3 retries).

* **initialDelay: 350ms** — The delay before the first retry.

* **multiplier: 2** — The factor by which the delay increases for each subsequent retry.
  With the defaults, the delays are: 350ms, 700ms, 1.4s.

* **maxDelay: 5 seconds** — The maximum delay between retries to avoid excessively long
  wait times.

The retry delay only starts after the method finishes executing. For example, if your
method takes 1 second to fail and the retry delay is 350ms, the first retry will start
1.35 seconds after the initial attempt began.

When the method finally fails (after `maxRetries` is reached), the last error will be
rethrown and the previous errors will be ignored.

You can modify the retry behavior by providing your own parameters. For example, to retry
up to 10 times:

```dart
void loadData() {
  mix(
    key: this,
    retry: retry(maxRetries: 10),
    ...
```

Other examples:

```dart
// Retry up to 5 times (6 total attempts), start at 1 second delay,
// doubling each time, up to 10 seconds max delay.
retry(maxRetries: 5, initialDelay: 1.sec, multiplier: 2.0, maxDelay: 10.sec)

// Retry unlimited times
retry(maxRetries: -1)
retry.unlimited

// Retry unlimited times, starting at 500ms delay
retry(initialDelay: 500.millis).unlimited
```
