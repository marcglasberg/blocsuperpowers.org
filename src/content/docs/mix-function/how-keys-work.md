---
title: How keys work
description: Complete explanation of how keys work across all Bloc Superpowers functions.
sidebar:
  order: 17
---

Keys are used throughout the Superpowers package to identify and track actions. They serve
different purposes depending on the context: tracking loading/error states, preventing
concurrent execution, controlling freshness, debouncing, throttling, and more.

This section provides a complete explanation of how keys work across all functions.

### The key parameter in mix

The `mix` function has a main `key` parameter that identifies the action:

```dart
void loadData() {
  mix(
    key: this, // The main key
    () async {
      var data = await api.loadData();
      emit(data);
    }
  );
}
```

This key is used for:

1. **State tracking**: `context.isWaiting(key)` and `context.isFailed(key)` use this key
   to determine which action is being queried.

2. **Default key for parameters**: Parameters like `fresh`, `debounce`, `throttle`,
   `nonReentrant`, and `sequential` use this key by default if they don't specify their
   own.

### What can be a key

A key can be any object:

* **`this`**: When you pass `key: this` inside a Cubit or Bloc, the key becomes the
  Cubit's (or Bloc's) `runtimeType`. This is the simplest and most common choice.
  In other words, `key: this` is the same as `key: runtimeType`.

* **A Type**: You can use any class type directly too, like `key: UserCubit` or
  `key: LoadData`.

* **A String**: Any string works as a key, like `key: 'loadUserData'`.

* **An Enum**: Enum values make good keys, like `key: ActionType.loadUser`.

* **A Record (tuple)**: Records are powerful for creating composite keys that vary by
  parameter. For example, `key: (LoadUser, userId)` creates a unique key per user ID.

### How key: this works

When you pass `key: this` inside a Cubit method, the key becomes the Cubit's
`runtimeType`, not the instance itself. This means:

```dart
class UserCubit extends Cubit<User> {
  void loadData() {
    mix(
      key: this, // Actually becomes: UserCubit (the runtimeType)
      () async {
        ...
      }
    );
  }
}
```

This is intentional. It means all instances and methods of `UserCubit` share the same key
for state tracking purposes. If you create multiple `UserCubit` instances, calling
`context.isWaiting(UserCubit)` will return `true` if any of them is loading.

### Keys for state tracking (isWaiting, isFailed)

The main `key` parameter determines what you pass to `context.isWaiting()` and
`context.isFailed()`:

```dart
// In the Cubit:
void loadData() {
  mix(
    key: this, // or key: UserCubit, or key: LoadUserData, etc.
    () async {
      ...
    }
  );
}

// In the widget:
if (context.isWaiting(UserCubit)) return CircularProgressIndicator();
if (context.isFailed(UserCubit)) return Text('Error');
```

You can also use more specific keys for finer-grained tracking:

```dart
// In the Cubit:
void loadUser(String userId) {
  mix(
    key: (LoadUser, userId), // Key now includes the user ID
    () async {
      ...
    }
  );
}

// In the widget:
if (context.isWaiting((LoadUser, userId))) return CircularProgressIndicator();
```

### Override keys in mix parameters

Parameters like `fresh`, `debounce`, `throttle`, `nonReentrant`, and `sequential` can
specify
their own `key` parameter that overrides the main key for just that feature.

This is useful when you want different granularity for different features. For example,
you might want state tracking at the Cubit level but freshness tracking per user ID.

#### Fresh with override key

```dart
void loadUser(String userId) {
  mix(
    key: this, // State tracking uses UserCubit
    fresh: fresh(
      key: (UserCubit, userId), // Freshness tracked per user ID
      freshFor: 5.sec,
    ),
    () async {
      var user = await api.loadUser(userId);
      emit(state.copyWith(users: {...state.users, userId: user}));
    }
  );
}
```

In this example:

* `context.isWaiting(UserCubit)` tracks whether any load is in progress
* Freshness is tracked separately for each `userId` — loading user "A" doesn't affect
  the freshness of user "B"

#### Debounce with override key

```dart
void searchInCategory(String category, String query) {
  mix(
    key: this, // State tracking uses SearchCubit
    debounce: debounce(key: (SearchCubit, category)), // Each category has its own debounce
    () async {
      var results = await api.searchInCategory(category, query);
      emit(state.copyWith(results: results));
    }
  );
}
```

Here, searching in "books" and "movies" categories have independent debounce timers.

#### Throttle with override key

```dart
void refreshFeed(String feedId) {
  mix(
    key: this, // State tracking uses FeedCubit
    throttle: throttle(key: (FeedCubit, feedId)), // Each feed has its own throttle
    () async {
      var posts = await api.fetchFeed(feedId);
      emit(state.copyWith(feeds: {...state.feeds, feedId: posts}));
    }
  );
}
```

Here, refreshing the "news" feed and "sports" feed have independent throttle periods.

#### NonReentrant with override key

```dart
void processItem(String itemId) {
  mix(
    key: this, // State tracking uses ItemCubit
    nonReentrant: nonReentrant(key: (ProcessItem, itemId)), // Non-reentrant per item
    () async {
      await api.processItem(itemId);
    }
  );
}
```

Here, processing item "A" and item "B" can run concurrently, but two calls to
process item "A" cannot run at the same time.

#### Sequential with override key

```dart
void sendMessage(String chatId, String message) {
  mix(
    key: this, // State tracking uses ChatCubit
    sequential: sequential(key: (ChatCubit, chatId)), // Separate queue per chat
    () async {
      await api.sendMessage(chatId, message);
    }
  );
}
```

Here, messages to chat "A" and chat "B" can be sent concurrently (different queues),
but messages within the same chat are queued and sent in order.

### Combining multiple override keys

You can use different keys for different parameters in the same `mix` call:

```dart
void loadUser(String userId) {
  mix(
    key: (LoadUser, userId), // State tracking per user
    fresh: fresh(key: (UserData, userId)), // Shared freshness with other methods
    nonReentrant: nonReentrant(key: (LoadUser, userId)), // Same as main key (could omit)
    throttle: throttle(key: LoadUser), // Throttle across all users
    sequential: sequential(key: (LoadUser, userId)), // Queue per user
    () async { ... }
  );
}
```

### Keys in optimisticCommand

The `optimisticCommand` function uses keys for two purposes:

1. **State tracking and non-reentrant protection** (main `key`)
2. **Separate non-reentrant key** (optional `nonReentrantKey`)

```dart
void addTodo(Todo newTodo) {
  await optimisticCommand(
    key: (AddTodo, newTodo.id), // Used for isWaiting/isFailed AND non-reentrant
    ...
  );
}
```

By default, the same key is used for both state tracking and non-reentrant protection.
You can specify a different `nonReentrantKey` if needed:

```dart
void addTodo(Todo newTodo) {
  await optimisticCommand(
    key: AddTodo, // For isWaiting/isFailed tracking only
    nonReentrantKey: (AddTodo, newTodo.id), // For non-reentrant protection
    ...
  );
}
```

This allows:

* `context.isWaiting(AddTodo)` returns `true` if any add is in progress
* But `addTodo(todoA)` and `addTodo(todoB)` can run concurrently
* While two calls to `addTodo(todoA)` cannot run at the same time

### Keys in optimisticSync

The `optimisticSync` function uses a single `key` for:

1. **Coalescing concurrent requests**: Only one request per key runs at a time
2. **State tracking**: Used with `isWaiting` and `isFailed`
3. **Follow-up detection**: Determines when a follow-up request is needed

```dart
void toggleLike(String itemId) {
  optimisticSync<bool>(
    key: ('toggleLike', itemId), // Unique per item
    ...
  );
}
```

Using a record key like `('toggleLike', itemId)` means:

* Each item has its own sync queue
* Toggling like on item "A" and item "B" can happen concurrently
* But rapid toggles on item "A" are coalesced into minimal requests

### Keys in optimisticSyncWithPush

The `optimisticSyncWithPush` function uses keys the same way as `optimisticSync`, plus:

1. **Coordinating with serverPush**: The key in `serverPush` must match the key used
   in `optimisticSyncWithPush` for proper coordination.

```dart
// User interaction
void toggleLike(String itemId) {
  await optimisticSyncWithPush<bool>(
    key: ('toggleLike', itemId), // Must match serverPush key
    ...
  );
}

// Server push handler
void handleLikePush(PushData data) {
  serverPush(
    key: ('toggleLike', data.itemId), // Must match optimisticSyncWithPush key
    ...
  );
}
```

If the keys don't match, the push won't be recognized as related to the optimistic
sync operation, and coordination will fail.

### Key equality

Keys are compared using Dart's standard equality rules:

* **Primitives** (String, int, etc.): Compared by value
* **Records**: Compared by structural equality (all fields must match)
* **Objects**: Compared by identity (same instance) unless `==` is overridden
* **Types**: Compared by identity (same type)
* **Cubits** and **Blocs**: Compared by their runtimeType

This means:

```dart
// These are equal:
('LoadUser', 'abc') == ('LoadUser', 'abc') // true (records)
'myKey' == 'myKey' // true (strings)
MyClass == MyClass // true (same Type)
MyCubit == MyCubit // true (same Type)
MyBloc == MyBloc // true (same Type)
MyCubit(123) == MyCubit(456) // true (same Cubit runtimeType)
MyBloc(123) == MyBloc(456) // true (same Bloc runtimeType)

// These are NOT equal:
('LoadUser', 'abc') == ('LoadUser', 'xyz') // false (different values)
MyClass() == MyClass() // false (different instances, unless == overridden)
```

### Best practices for keys

1. **Use `key: this` for simple cases**: When you have one main method per Cubit,
   `key: this` is the simplest choice.

2. **Use records for parameterized actions**: When an action varies by some parameter
   (user ID, item ID, etc.), include that parameter in a record key.

3. **Use Types for cross-Cubit coordination**: If multiple Cubits need to share a
   fresh period or throttle, use a shared Type as the key.

4. **Keep keys simple**: Don't include unnecessary data in keys. Only include what's
   needed to distinguish different logical operations.

5. **Be consistent**: Use the same key pattern for related operations. If `loadUser`
   uses `(LoadUser, userId)`, then `refreshUser` should probably use a similar pattern.

### Summary table

| Function                 | Key Purpose                                             | Override Key Support       |
|--------------------------|---------------------------------------------------------|----------------------------|
| `mix`                    | State tracking (isWaiting/isFailed), default for params | N/A (this IS the main key) |
| `fresh`                  | Track freshness per key                                 | Yes, via `key` parameter   |
| `debounce`               | Debounce per key                                        | Yes, via `key` parameter   |
| `throttle`               | Throttle per key                                        | Yes, via `key` parameter   |
| `nonReentrant`           | Prevent concurrent execution per key                    | Yes, via `key` parameter   |
| `sequential`             | Queue calls per key                                     | Yes, via `key` parameter   |
| `optimisticCommand`      | State tracking + non-reentrant                          | Yes, via `nonReentrantKey` |
| `optimisticSync`         | Coalescing + state tracking                             | No                         |
| `optimisticSyncWithPush` | Coalescing + state tracking + push coordination         | No                         |
