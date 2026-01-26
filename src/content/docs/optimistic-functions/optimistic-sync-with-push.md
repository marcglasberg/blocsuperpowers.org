---
title: Optimistic sync with push
description: Advanced optimistic sync for apps with server-pushed updates via WebSockets, SSE, or Firebase.
sidebar:
   
  order: 15
---

The `optimisticSyncWithPush` function is an advanced version of `optimisticSync` designed
for apps that receive **server-pushed updates** via WebSockets, Server-Sent Events (SSE),
Firebase, or similar real-time technologies.

It supports:

- **Optimistic UI**: Immediate feedback on every interaction
- **Multi-device writes**: Multiple devices can modify the same data
- **Server push**: Real-time updates from the server
- **Out-of-order delivery**: Handles updates that arrive in the wrong order
- **Last write wins**: Consistent conflict resolution across devices

**IMPORTANT:** If your app does not receive server-pushed updates, use `optimisticSync`
instead — it's simpler and doesn't require revision tracking.

### When to use OptimisticSyncWithPush

Use this when:

1. Your app receives real-time updates from a server (WebSockets, Firebase, etc.)
2. Multiple devices or users can modify the same data
3. You need "last write wins" semantics for conflict resolution
4. Updates may arrive out of order due to network conditions

### How it differs from OptimisticSync

| Feature             | OptimisticSync     | OptimisticSyncWithPush |
|---------------------|--------------------|------------------------|
| Server pushes       | Not supported      | Fully supported        |
| Multi-device        | Single device only | Multiple devices       |
| Follow-up detection | Compares values    | Uses revision numbers  |
| Complexity          | Simpler            | More complex           |

### How it works

```
State: liked = false

User taps LIKE:
  → State: liked = true (optimistic)
  → Lock acquired, Request 1 sends: setLiked(true)
  → Local-revision is 1

User taps UNLIKE (Request 1 still in flight):
  → State: liked = false (optimistic)
  → No request sent (locked)
  → Local-revision is 2

User taps LIKE (Request 1 still in flight):
  → State: liked = true (optimistic)
  → No request sent (locked)
  → Local-revision is 3

Request 1 completes:
  → Last change was NOT from a push
  → Request's revision (1) < current revision (3)
  → Follow-up needed: Request 2 sends: setLiked(true)

Request 2 completes:
  → Request's revision (3) == current revision (3)
  → No follow-up needed, lock released
```

### Flow with server push

```
State: liked = false

User taps LIKE:
  → State: liked = true (optimistic)
  → Lock acquired, Request 1 sends: setLiked(true)
  → Local-revision is 1

User taps UNLIKE (Request 1 still in flight):
  → State: liked = false (optimistic)
  → No request sent (locked)
  → Local-revision is 2

A PUSH arrives with liked = false

Request 1 completes:
  → Last change was from a PUSH
  → No follow-up needed (push already synced with server)
  → Lock released
```

### Basic usage

```dart
class ItemCubit extends Cubit<ItemState> {
  ItemCubit() : super(ItemState());

  void toggleLike(String itemId) {
    await optimisticSyncWithPush<bool>(
      key: ('toggleLike', itemId),

      // The value to apply optimistically.
      valueToApply: () => !state.items[itemId].isLiked,

      // How to apply the value to state.
      applyOptimisticValueToState: (state, isLiked) =>
          state.copyWith(items: state.items.setLiked(itemId, isLiked)),

      // How to read the value from state.
      getValueFromState: (state) => state.items[itemId].isLiked,

      // Get the stored server revision for this key. Return -1 if unknown.
      getServerRevisionFromState: (key) => state.revisions[key] ?? -1,

      // Send to server. MUST call informServerRevision()!
      sendValueToServer: (isLiked, localRevision, deviceId, informServerRevision) async {
        var response = await api.setLiked(
          itemId,
          isLiked,
          localRevision: localRevision,
          deviceId: deviceId,
        );
        if (!response.ok) throw Exception('Server error');

        // You MUST call this with the server's revision!
        informServerRevision(response.serverRevision);

        return response.liked;
      },

      // Apply server response when state stabilizes.
      applyServerResponseToState: (state, serverResponse) =>
          state.copyWith(items: state.items.setLiked(itemId, serverResponse as bool)),
    );
  }
}
```

### The informServerRevision requirement

Your `sendValueToServer` callback **must** call `informServerRevision()` with the
server's revision number after a successful request. This is essential for:

- Tracking the latest known server revision
- Determining whether to apply server responses (stale responses are ignored)
- Handling out-of-order pushes correctly

If you don't call it, a `StateError` is thrown at runtime.

```dart
sendValueToServer: (value, localRevision, deviceId, informServerRevision) async {
  var response = await api.updateValue(value, localRevision, deviceId);
  if (!response.ok) throw Exception('Server error');

  // REQUIRED: inform the server revision
  informServerRevision(response.serverRevision);

  return response.value;
},
```

### Server requirements

Your server must:

1. **Return a revision number**: A monotonically increasing value (timestamp, version
   number, etc.) that allows ordering updates across devices.

2. **Accept revision metadata**: When saving, receive the `localRevision` and `deviceId`
   from the client.

3. **Include metadata in pushes**: When pushing updates to clients, include:
    - `serverRevision`: The server's revision number
    - `localRevision`: The local revision that triggered this change
    - `deviceId`: The device ID that made the change

### Handling server pushes

Use `serverPush()` to apply server-pushed values. This coordinates with
`optimisticSyncWithPush` to prevent conflicts:

```dart
class ItemCubit extends Cubit<ItemState> {
  // ... toggleLike method from above ...

  // Call this when receiving a push from WebSocket/Firebase/etc.
  void handleLikePush(PushData data) {
    serverPush(
      // Must match the key used in optimisticSyncWithPush!
      key: ('toggleLike', data.itemId),

      // The metadata from the push
      pushMetadata: (
        serverRevision: data.serverRev,
        localRevision: data.localRev,
        deviceId: data.deviceId,
      ),

      // How to read the stored server revision
      getServerRevisionFromState: (key) => state.revisions[key] ?? -1,

      // Apply the push and save the server revision
      applyServerPushToState: (state, key, serverRev) =>
          state.copyWith(
            items: state.items.setLiked(data.itemId, data.liked),
            revisions: state.revisions.add(key, serverRev),
          ),
    );
  }
}
```

### The PushMetadata type

```dart
typedef PushMetadata = ({
  int serverRevision, // Server's revision number
  int localRevision, // Local revision that triggered this (if from this device)
  int deviceId, // Device ID that made the change
});
```

### Storing the server revision in state

You must store the server revision in your state so it persists across app restarts:

```dart
class ItemState {
  final Map<String, Item> items;
  final Map<Object, int> revisions; // key → serverRevision

  // ...
}
```

The `getServerRevisionFromState` callback should return the stored revision:

```dart
getServerRevisionFromState: (key) => state.revisions[key] ?? -1,
```

Return `-1` when the revision is unknown.

### Handling completion and errors

Use `onFinish` to handle completion:

```dart
await optimisticSyncWithPush<bool>(
  key: ('toggleLike', itemId),
  // ... other parameters ...

  onFinish: (error) async {
    if (error != null) {
      // Request failed - reload from server
      var item = await api.getItem(itemId);
      return state.copyWith(items: state.items.update(itemId, item));
    }
    return null; // Success, no state change needed
  },
);
```

### Device ID

By default, a random device ID is generated once per app run. You can customize this
by setting the global `optimisticSyncWithPushDeviceId` function:

```dart
// Set a persistent device ID (e.g., from secure storage)
optimisticSyncWithPushDeviceId = () => myPersistentDeviceId;
```

### Complete example

```dart
class TodoCubit extends Cubit<TodoState> {
  TodoCubit() : super(TodoState());

  // User interaction: toggle todo completion
  void toggleComplete(String todoId) {
    await optimisticSyncWithPush<bool>(
      key: ('toggleComplete', todoId),

      valueToApply: () => !state.todos[todoId].isComplete,

      applyOptimisticValueToState: (state, isComplete) =>
          state.copyWith(todos: state.todos.setComplete(todoId, isComplete)),

      getValueFromState: (state) => state.todos[todoId].isComplete,

      getServerRevisionFromState: (key) => state.revisions[key] ?? -1,

      sendValueToServer: (isComplete, localRev, deviceId, informServerRev) async {
        var response = await api.setTodoComplete(
          todoId, isComplete, localRev, deviceId,
        );
        informServerRev(response.serverRevision);
        return response.isComplete;
      },

      applyServerResponseToState: (state, serverResponse) =>
          state.copyWith(todos: state.todos.setComplete(todoId, serverResponse as bool)),

      onFinish: (error) async {
        if (error != null) {
          var todo = await api.getTodo(todoId);
          return state.copyWith(todos: state.todos.update(todoId, todo));
        }
        return null;
      },
    );
  }

  // Handle server push from WebSocket
  void handleTodoPush(PushData data) {
    serverPush(
      key: ('toggleComplete', data.todoId),
      pushMetadata: (
        serverRevision: data.serverRev,
        localRevision: data.localRev,
        deviceId: data.deviceId,
      ),
      getServerRevisionFromState: (key) => state.revisions[key] ?? -1,
      applyServerPushToState: (state, key, serverRev) =>
          state.copyWith(
            todos: state.todos.setComplete(data.todoId, data.isComplete),
            revisions: state.revisions.add(key, serverRev),
          ),
    );
  }
}
```
