---
title: Setup and features
description: How to set up the Bloc Superpowers package in your Flutter app.
sidebar:
  order: 1
---

Bloc Superpowers is a Flutter/Dart package created by Marcelo Glasberg, available on pub.dev since Jan 2026.
Click [here](https://pub.dev/packages/bloc_superpowers) to visit the package page,
and [here](https://pub.dev/publishers/glasberg.dev/packages) to see all my 17+ packages in pub.dev.

### In `pubspec.yaml`

```yaml
dependencies:
  bloc_superpowers: ^1.0.0 # Check the latest version
  flutter_bloc: ^9.1.1 # Check the latest version
  fast_immutable_collections: ^11.1.0 # Optional, if you want to use IList
```

### In your widget tree

Add widget `Superpowers` near the top of your widget tree,
somewhere above your `MaterialApp`:

```dart
Widget build(BuildContext context) {
  return Superpowers(
    ...
    child: MaterialApp(
      ...
```

> _Note: Failing to add the `Superpowers` widget will result in runtime errors when you use
> `isWaiting`, `isFailed`, or `getException` context extensions. All the rest will still work._

## List of features

* [`context.isWaiting()`](/get-started/loading-and-error-states): Use it to show spinners or loading indicators when a
  Cubit is
  loading. No need to add explicit loading states to your Cubits anymore.

* [`context.isFailed()`](/get-started/loading-and-error-states): Show error messages when a Cubit has failed. No need to
  add
  explicit error states and error messages to your Cubits anymore.

* [`UserException`](/get-started/showing-error-dialogs): A Cubit that fails can now just throw exceptions.

* [`UserExceptionDialog` and `UserExceptionToast`](/get-started/showing-error-dialogs): Widgets that shows an error
  dialog or
  toast when a Cubit throws a UserException.

* [`retry`](/mix-function/retry): Easily retry failed Cubit methods.

* [`checkInternet`](/mix-function/check-internet): Check for internet connectivity before executing Cubit methods.

* [`nonReentrant`](/mix-function/non-reentrant): Prevent Cubit methods from being called simultaneously.

* [`sequential`](/mix-function/sequential): Queue Cubit method calls and process them one after another, in order.

* [`fresh`](/mix-function/fresh): Treat Cubit methods as fresh for some time. Prevent reloading data too often.

* [`debounce`](/mix-function/debounce): Debounce Cubit method calls to avoid rapid successive calls.

* [`throttle`](/mix-function/throttle): Throttle Cubit method calls to limit how often they can be called.

* [`catchError`](/advanced/predefined-configurations): Suppress errors, rethrow them, or wrap them in user-friendly
  exceptions.

* [`MixConfig`](/advanced/predefined-configurations): Create reusable configurations for the `mix` function.

* [`MixPreset`](/advanced/mix-presets): Create your own reusable `mix` functions.

* [`optimisticCommand`](/optimistic-functions/optimistic-command): Applying an optimistic state change immediately, then
  run the
  command on the server, optionally rolling back and reloading.

* [`optimisticSync`](/optimistic-functions/optimistic-sync): Update the UI immediately and send the updated value to the
  server,
  making sure the server and the UI are eventually consistent.

* [`optimisticSyncWithPush`](/optimistic-functions/optimistic-sync-with-push): Similar to optimisticSync, but resilient
  to server-pushed
  updates that may modify the same state this action controls.

* [`Effect`](/effects/effects): Class that allows Cubits to emit one-time effects to the UI,
  such as navigation events, dialogs, toasts. Replaces `BlocListener`.

* [`EffectQueue`](/effects/effect-queues): Class that allows Cubits to emit queued one-time effects to the UI,
  ensuring they are shown one after the other.

* [`globalCatchError`](/advanced/global-catch-error): Set a global error handler for all mix calls in your app.
  Log errors, show friendly messages, or convert API errors to user exceptions in one place.

* [`observer`](/advanced/global-observer): Set up a global observer to track all mix calls for performance tracking,
  analytics, debugging, and monitoring.

* [`props`](/advanced/props): Key-value storage for shared data like timers and streams that gets
  automatically cleaned up on logout or in tests.

* [Claude Code Skills](/claude-code-skills): Use AI to help you write and improve code that uses Bloc Superpowers.
  

