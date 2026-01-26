---
title: Fresh
description: How to prevent reloading data too often by treating Cubit method results as fresh for a period of time.
sidebar:
  order: 8
---

The `fresh` parameter is often used by methods that load information from the server.

Suppose you want to load profile information as soon as the user enters a screen.
If the user quickly leaves and re-enters the screen,
do you want to reload the profile again?
Probably not, because the information is likely still valid.
However, if the user only returns after several minutes,
then you may want to reload the profile to ensure it's up to date.

### Basic usage

You want to treat the result of a method as fresh for a given "fresh period".
You can think of that fresh period as the time during which the loaded data
is still good to use.

While the information is fresh, repeated calls with the same key are skipped,
because that information is assumed to still be valid in the state.

After the fresh period ends, the information is considered "stale".
The next method call with the same key is allowed to run again,
update the state, and start a new fresh period.

In short, `fresh` helps you avoid reloading the same information too often.

A simple example in a `StatefulWidget` that loads information
as soon as the widget is created:

```dart
class MyScreen extends StatefulWidget {
  State<MyScreen> createState() => _MyScreenState();
}

class _MyScreenState extends State<MyScreen> {
  void initState() {
    super.initState();
    context.read<UserCubit>().loadData(); // Here!
  }

  Widget build(BuildContext context) {
    var user = context.watch<UserCubit>().state;
    return Text('User: $user');
  }
}
```

Use `fresh` on the loading method so it does not run again while its data is still fresh:

```dart
class UserCubit extends Cubit<User> {
  UserCubit() : super(User());

  void loadData() {
    mix(
      key: this,
      fresh: fresh, // Data is fresh for 1 second (the default)
      () async {
        var user = await api.loadUser();
        if (user == null) throw UserException('Failed to load user');
        emit(user);
      }
    );
  }
}
```

### How long data stays fresh

The `freshFor` value is a `Duration`. The default is 1 second.

To keep the data fresh for 5 seconds:

```dart
fresh: fresh(freshFor: 5.sec),
```

### How fresh keys work

Freshness is tracked per key.
Any two calls that share the same key share the same fresh period.

By default, when you pass `key: this` to `mix`, the key is the Cubit's `runtimeType`.
This means all calls from the same Cubit type share the same fresh period.

If you dispatch `loadData()` many times in a short period, only the first one runs while
the data is fresh. The others are aborted. Later, when the fresh period ends, the next
call will run the method again.

### Using a separate key per parameter

Many methods need a separate fresh period per id, url, or some other field.
In that case, use a record or tuple as the key. Methods with the same key type
but different key values do not affect each other.

```dart
class UserCubit extends Cubit<Map<String, User>> {
  UserCubit() : super({});

  void loadUser(String userId) {
    mix(
      key: this,

      // Each different user has its own fresh period.
      fresh: fresh(key: (UserCubit, userId)),

      () async {
        var user = await api.loadUser(userId);
        emit({...state, userId: user});
      }
    );
  }
}
```

Now `loadUser('A')` and `loadUser('B')` track freshness independently, but two calls
of `loadUser('A')` within the fresh period will only run the first one.

You can also use more than one field in the key:

```dart
// Each different cart for each different user has its own fresh period.
fresh: fresh(key: (LoadCart, userId, cartId), freshFor: 5.sec),
```

### Forcing the method to run

Sometimes you want to run the method even if the data is still fresh.
For that, set `ignoreFresh: true`. When `ignoreFresh` is `true`, the method always
runs and also starts a new fresh period for its key.

A common pattern is to add a `force` parameter:

```dart
void loadData({bool force = false}) {
  mix(
    key: this,
    fresh: fresh(freshFor: 5.sec, ignoreFresh: force), // Here!
    () async {
      var user = await api.loadUser();
      emit(user);
    }
  );
}
```

With this setup:

* `loadData()` runs only when its key is stale.
* `loadData(force: true)` always runs and also refreshes the key.

### When the method fails

If a method that uses `fresh` throws an error, the freshness is rolled back,
as if that failing run did not happen.

In practice:

* If there was no fresh entry for that key before the method started,
  the key is cleared. You can call the method again right away.
* If there was already a fresh time stored for that key, that time is kept.
* If another method using the same key finished after this one started and
  changed the fresh time, that newer fresh time is kept as is.

This means:

* Errors never extend the fresh time by themselves.
* A failure from an older call does not cancel a newer successful call
  that used the same key.

### Manually invalidating freshness

You can also control freshness programmatically:

* Call `removeFreshKey(key)` to remove a specific key, so the next call
  for that key can run immediately.

* Call `removeAllFreshKeys()` to clear all keys and let all methods run
  again as if nothing was fresh. This is useful during logout or similar scenarios.

```dart
// After editing profile, invalidate the load action's freshness
void updateProfile(Profile data) {
  mix(
    key: this,
    () async {
      await api.updateProfile(data);
      removeFreshKey((UserCubit, 'loadData')); // Allow immediate reload
    }
  );
}
```

Expired keys are cleaned automatically over time,
so you usually do not need to worry about old entries.

### Sharing keys across different methods

If you want different methods to share the same key, simply use the same key value.
This is useful when several methods read or write the same logical resource and
should respect the same fresh period.

For example, two methods that work on the same user data:

```dart
class UserCubit extends Cubit<UserState> {
  UserCubit() : super(UserState());

  void loadProfile(String userId) {
    mix(
      key: this,
      fresh: fresh(key: ('userData', userId)), // same key
      () async {
        var profile = await api.loadProfile(userId);
        emit(state.copyWith(profile: profile));
      }
    );
  }

  void loadSettings(String userId) {
    mix(
      key: this,
      fresh: fresh(key: ('userData', userId)), // same key
      () async {
        var settings = await api.loadSettings(userId);
        emit(state.copyWith(settings: settings));
      }
    );
  }
}
```

Here:

* `loadProfile('123')` and `loadSettings('123')` share one fresh period,
  because they use the same key.
* Any object can be a key, for example an enum or a constant string.

### Combining fresh with other parameters

It's common to combine `fresh` with `retry` or `nonReentrant`:

```dart
void loadData() {
  mix(
    key: this,
    fresh: fresh(freshFor: 10.sec),
    retry: retry,
    nonReentrant: nonReentrant,
    () async {
      var user = await api.loadUser();
      emit(user);
    }
  );
}
```
