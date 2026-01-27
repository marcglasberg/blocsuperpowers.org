---
title: Global catchError handler
description: How to set a global error handler for all mix calls in your application.
sidebar:
  order: 100
---

When errors happen in your app, you often want to do two things:

1. **Log all errors** so you can find and fix bugs later.
2. **Show friendly messages** to the user instead of technical error messages.

Instead of adding the same error handling code to every `mix` call, you can set up a
**global error handler** that runs for all errors in your app.

### Setting up the global error handler

To set up a global error handler, assign a function to `Superpowers.globalCatchError`:

```dart
void main() {
  Superpowers.globalCatchError = (error, stackTrace, key) {
    // This runs for every error that is not handled elsewhere
  };

  runApp(
    Superpowers(
      child: MaterialApp(...),
    ),
  );
}
```

The function receives three things:

- `error`: The error that was thrown.
- `stackTrace`: Where the error came from.
- `key`: The key used in the `mix` call. This helps you know which action failed.

### What can the global handler do?

The global handler can do one of three things:

1. **Suppress the error** by returning normally (not throwing anything).
2. **Show a dialog** by throwing a `UserException`.
3. **Let the error crash** by throwing something else.

Let's look at each option.

### Option 1: Suppress the error

If your global handler returns without throwing, the error goes away silently:

```dart
Superpowers.globalCatchError = (error, stackTrace, key) {
  // Log the error but don't show anything to the user
  logError(error, stackTrace);
  // Not throwing means the error is suppressed
};
```

This is useful when you want to log errors but not bother the user.

### Option 2: Show a dialog to the user

If your global handler throws a `UserException`, the error dialog appears:

```dart
Superpowers.globalCatchError = (error, stackTrace, key) {
  // Log the error
  logError(error, stackTrace);

  // Show a friendly message to the user
  throw UserException('Something went wrong. Please try again.');
};
```

The `UserException` message is what the user sees in the dialog.

### Option 3: Let the error crash

If your global handler throws something that is not a `UserException`,
the error keeps going and may crash your app:

```dart
Superpowers.globalCatchError = (error, stackTrace, key) {
  // Just rethrow - the app may crash
  throw error;
};
```

This is rarely what you want in production.
However, it can be useful during development to make errors more visible.

### Debug vs production behavior

A good practice is to let errors crash in debug mode so you notice them right away,
but always show a friendly message in production:

```dart
import 'package:flutter/foundation.dart';

Superpowers.globalCatchError = (error, stackTrace, key) {
  // Always log the error
  logError(error, stackTrace);

  // If it's already a UserException, show it
  if (error is UserException) {
    throw error;
  }

  // In debug mode, let the error crash so you notice it
  if (kDebugMode) {
    throw error;
  }

  // In production, always show a friendly message
  throw UserException('Something went wrong. Please try again.');
};
```

With this setup:

- During development, unexpected errors crash the app and show in the console.
  This helps you find and fix bugs quickly.
- In production, users never see ugly error messages.
  They always get a friendly dialog.

### Use case: Log all errors

One common use case is logging every error that happens:

```dart
Superpowers.globalCatchError = (error, stackTrace, key) {
  // Send to your logging service
  MyLogger.logError(
    error: error,
    stackTrace: stackTrace,
    context: 'Failed during: $key',
  );

  // Still show a dialog to the user
  throw UserException('Something went wrong. Please try again.');
};
```

Now every error in your app is logged automatically,
and users always see a friendly message.

### Use case: Convert API errors to friendly messages

When you use Firebase, Dio, or other libraries, they throw their own error types.
Users should not see these technical errors.
You can convert them to friendly messages:

```dart
Superpowers.globalCatchError = (error, stackTrace, key) {
  // Always log the real error
  logError(error, stackTrace);

  // If it's already a UserException, show it as is
  if (error is UserException) {
    throw error;
  }

  // Convert Firebase errors
  if (error is FirebaseAuthException) {
    switch (error.code) {
      case 'user-not-found':
        throw UserException('No account found with this email.');
      case 'wrong-password':
        throw UserException('Incorrect password. Please try again.');
      default:
        throw UserException('Login failed. Please try again.');
    }
  }

  // Convert network errors
  if (error is SocketException || error is TimeoutException) {
    throw UserException('Could not connect to the server. Check your internet.');
  }

  // Convert Dio errors
  if (error is DioException) {
    if (error.type == DioExceptionType.connectionTimeout) {
      throw UserException('Connection timed out. Please try again.');
    }
    throw UserException('Server error. Please try again later.');
  }

  // For any other error, show a generic message
  throw UserException('Something went wrong. Please try again.');
};
```

With this setup:

- All errors are logged with full details for debugging.
- Users see helpful messages instead of "SocketException" or "FirebaseAuthException".
- You can add more error types as you discover them.

### When is the global handler called?

The global handler is called **only when errors reach it**. It is **not** called when:

- A local `catchError` in `mix` suppresses the error.
- A `catchError` in `MixConfig` suppresses the error.

The order of error handling is:

1. First, the `catchError` in the `mix` call (if any).
2. Then, the `catchError` in `MixConfig` (if any).
3. Finally, the global `Superpowers.globalCatchError` (if any).

If any handler suppresses the error (returns without throwing),
the next handlers are not called.

Here is an example that shows this:

```dart
// This error is suppressed locally, so global handler is NOT called
mix(
  key: this,
  catchError: (error, stackTrace) {
    // Returning normally suppresses the error
  },
  () async {
    throw Exception('This error is suppressed locally');
  },
);

// This error reaches the global handler
mix(
  key: this,
  () async {
    throw Exception('This error reaches global handler');
  },
);
```

### Using the key for context

The `key` parameter tells you which action failed.
This is helpful for logging:

```dart
Superpowers.globalCatchError = (error, stackTrace, key) {
  print('Error in action: $key');
  print('Error: $error');
  // ...
};
```

If your key is a record like `(UserCubit, userId)`,
you can see both the action type and the specific parameters that failed.

### Clearing the global handler

In tests, you should reset the global handler between tests.
Calling `Superpowers.clear()` removes the global handler:

```dart
setUp(() {
  Superpowers.clear();
});
```

You can also set a different handler for specific tests:

```dart
test('my test', () {
  Superpowers.globalCatchError = (error, stackTrace, key) {
    // Custom handling for this test
  };

  // Your test code
});
```

### Summary

- Set `Superpowers.globalCatchError` to handle all errors in one place.
- Return normally to suppress errors silently.
- Throw `UserException` to show a dialog with a friendly message.
- Use this for centralized logging and converting API errors to user messages.
- The global handler only runs when local handlers don't suppress the error.

