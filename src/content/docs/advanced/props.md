---
title: Props
description: Using props to store shared data like timers and streams in Superpowers.
sidebar:
  order: 102
---

## Props

Props are a simple key-value storage that lives statically inside `Superpowers`.
You can use props to store any data that needs to be shared across your app,
such as timers, streams, futures, or any other objects.

It's totally optional to use this.
The main benefit of using props is that they are **automatically cleaned up**
when you call `Superpowers.clear()` in tests, or `Superpowers.prepareToLogout()`
when the user logs out.

### Saving and reading props

Use `Superpowers.setProp()` to save a value, and `Superpowers.prop<T>()` to read it:

```dart
// Save a timer
Superpowers.setProp('refreshTimer', Timer.periodic(
  Duration(minutes: 5),
  (_) => refreshData(),
));

// Read it later
var timer = Superpowers.prop<Timer>('refreshTimer');
timer.cancel();
```

The key can be any object: a string, an enum, a type, or even a record:

```dart
// Using a string key
Superpowers.setProp('lastSync', DateTime.now());

// Using an enum key
enum PropKey { authToken, userProfile, settings }
Superpowers.setProp(PropKey.authToken, 'abc123');

// Using a type as key
Superpowers.setProp(MyService, MyService());

// Using a record key (useful when you need multiple values per type)
Superpowers.setProp((MyService, 'primary'), primaryService);
Superpowers.setProp((MyService, 'backup'), backupService);
```

### Why use props instead of global variables?

You might wonder: why not just use a global variable or a static field?

The answer is **testability and cleanup**.

When you run tests, you need to reset all state between tests.
If you use global variables, you have to remember to reset each one manually.
With props, you just call `Superpowers.clear()` and everything is reset:

```dart
// In your test file
setUp(() {
  Superpowers.clear();
});
```

Similarly, when a user logs out, you want to clean up all user-specific data.
With props, you call `Superpowers.prepareToLogout()` and all timers are cancelled,
streams are closed, and data is cleared:

```dart
Future<void> logout() async {
  await Superpowers.prepareToLogout();
  await authService.signOut();
  Navigator.pushReplacementNamed(context, '/login');
}
```

### Automatic disposal of timers, streams, and futures

When props are cleared, Superpowers automatically disposes certain types:

| Type                 | What happens                                     |
|----------------------|--------------------------------------------------|
| `Timer`              | `cancel()` is called                             |
| `Future`             | `ignore()` is called (prevents unhandled errors) |
| `StreamSubscription` | `cancel()` is called                             |
| `StreamConsumer`     | `close()` is called                              |
| `Sink`               | `close()` is called                              |

This means you don't have to manually cancel timers or close streams
when the user logs out or when tests finish.

### Manual disposal with disposeProps

You can also dispose props manually using `Superpowers.disposeProps()`:

```dart
// Dispose ALL timers, streams, futures, etc.
Superpowers.disposeProps();

// Dispose only specific props using a predicate
Superpowers.disposeProps(({key, value}) => value is Timer);

// Dispose props with keys starting with 'temp'
Superpowers.disposeProps(({key, value}) => key.toString().startsWith('temp'));
```

To dispose a single prop by its key:

```dart
Superpowers.disposeProp('refreshTimer');
```

### Use cases

**Storing a refresh timer:**

```dart
class DashboardCubit extends Cubit<DashboardState> {
  DashboardCubit() : super(DashboardState()) {
    // Start a refresh timer
    Superpowers.setProp(
      (DashboardCubit, 'refreshTimer'),
      Timer.periodic(Duration(minutes: 1), (_) => refresh()),
    );
  }

  void refresh() => mix(key: this, () async {
    final data = await api.getDashboard();
    emit(state.copyWith(data: data));
  });
}
```

When the user logs out, `prepareToLogout()` will cancel this timer automatically.

**Storing a stream subscription:**

```dart
void startListeningToMessages() {
  final subscription = messageService.onMessage.listen((message) {
    emit(state.copyWith(messages: [...state.messages, message]));
  });

  // Store the subscription so it can be cancelled on logout
  Superpowers.setProp('messageSubscription', subscription);
}
```

**Storing user session data:**

```dart
// After login
Superpowers.setProp('currentUser', user);
Superpowers.setProp('authToken', token);

// Read anywhere in the app
var user = Superpowers.prop<User>('currentUser');

// On logout, prepareToLogout() clears all of this
```

### clear() vs prepareToLogout()

Use `Superpowers.clear()` in **tests** to reset everything:

```dart
setUp(() {
  Superpowers.clear();
});
```

Use `Superpowers.prepareToLogout()` in **production** when the user logs out:

```dart
Future<void> logout() async {
  await Superpowers.prepareToLogout();
  await authService.signOut();
}
```

The difference:

| What gets reset               | `clear()`          | `prepareToLogout()` |
|-------------------------------|--------------------|---------------------|
| Props (timers, streams, etc.) | ✅                  | ✅                   |
| Error queue                   | ✅                  | ✅                   |
| Waiting/failed state          | ✅                  | ✅                   |
| `globalCatchError`            | ✅ Reset to null    | ❌ Kept              |
| `observer`                    | ✅ Reset to null    | ❌ Kept              |
| `maxErrorsQueued`             | ✅ Reset to default | ❌ Kept              |

`prepareToLogout()` keeps your app-level configuration (error handling, analytics)
while clearing user-specific data.
