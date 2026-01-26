---
title: Check Internet
description: How to check for internet connectivity before executing Cubit methods.
sidebar:
  order: 7
---

To check for internet connectivity before executing a Cubit method,
simply add the `checkInternet` parameter to the `mix` function, with
value `checkInternet`:

```dart
void loadData() {
  mix(
    key: this,
    checkInternet: checkInternet,
    ...
```

Now, if you try to call `loadData` when there is no internet connection,
the method will not be executed. The Cubit will enter the failed state,
and a `ConnectionException` with message "No internet connection" will be thrown.
If you configured a `UserExceptionDialog` as explained earlier,
an error dialog will be shown asking the user to connect to the internet.

**Important:** This only checks if the internet is on or off on the device, not if the
internet provider is actually providing the service or if the server is available.
So, it is possible that the check succeeds but internet requests still fail.

### Abort silently when there is no internet

If you don't want to show an error dialog or throw an exception when there's no internet,
you can use `abortSilently: true`. The method will simply not execute and return
immediately, as if it had never been called:

```dart
void loadData() {
  mix(
    key: this,
    checkInternet: checkInternet(abortSilently: true),
    ...
```

This is useful for background sync operations where it's acceptable to skip
the operation when offline.

### Throw without showing a dialog

If you want to throw a `ConnectionException` but handle it in your widget instead of
showing a dialog automatically, set `ifOpenDialog: false`:

```dart
void loadData() {
  mix(
    key: this,
    checkInternet: checkInternet(ifOpenDialog: false),
    ...
```

Then handle the error in your widget:

```dart
if (context.isFailed(LoadData)) Text('No Internet connection');
```

### Loading as soon as internet is available

If you have a Cubit that needs to keep trying to load from the internet until it succeeds,
you can combine `checkInternet` with **unlimited** `retry`:

```dart
void loadData() {
  mix(
    key: this,
    checkInternet: checkInternet,
    retry: retry.unlimited,
    ...
```

When combined with retry, the internet check is performed before each retry attempt.
If there's no internet, it counts as a failed attempt and triggers the retry mechanism.

The `checkInternet` parameter has a `maxRetryDelay` option (defaults to 1 second) that
controls how often connectivity is rechecked when there's no internet. This allows for
quicker detection of when internet comes back, regardless of the `maxDelay` setting
in the `retry` parameter:

```dart
void loadData() {
  mix(
    key: this,
    checkInternet: checkInternet(maxRetryDelay: 500.millis),
    retry: retry.unlimited(maxDelay: 5.sec), // Max delay is 5 seconds for other errors
    ...
```

### Summary of checkInternet options

The `checkInternet` parameter has these defaults:

```dart
checkInternet(
  abortSilently: false,    // If true, abort silently without exception
  ifOpenDialog: true,      // If true, show dialog (only when abortSilently is false)
  maxRetryDelay: 1.sec,    // Max delay between retries when no internet (with retry)
)
```
