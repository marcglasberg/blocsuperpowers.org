---
title: Optimistic sync
description: How to update the UI immediately and sync with the server, ensuring eventual consistency.
sidebar:
  order: 14
---

The `optimisticSync` function is designed for **save operations** where user interactions
should update the UI immediately and the server should be eventually consistent.
Typical examples are:

* Like or follow toggle
* Settings switch
* Slider, checkbox
* Any field where the last value wins

Unlike `optimisticCommand`, which is for one-time commands, `optimisticSync` is built
for rapid interactions where users may tap many times quickly. It coalesces intermediate
changes into a minimal number of server calls while guaranteeing immediate UI feedback
on every interaction.

### The problem

Consider a "like" button. When the user taps it, you want:

1. **Immediate feedback**: The UI should update instantly
2. **Eventual consistency**: The server should reflect the final state
3. **Minimal requests**: If the user taps 5 times quickly, you shouldn't send 5 requests

### How OptimisticSync solves it

```
State: liked = false (server confirmed)

User taps LIKE:
  → State: liked = true (optimistic)
  → Lock acquired, Request 1 sends: setLiked(true)

User taps UNLIKE (Request 1 still in flight):
  → State: liked = false (optimistic)
  → No request sent (locked)

User taps LIKE (Request 1 still in flight):
  → State: liked = true (optimistic)
  → No request sent (locked)

Request 1 completes:
  → Sent value was `true`, current state is `true`
  → They match, no follow-up needed, lock released
```

In this example, 3 user taps result in only 1 server request, and the UI updated
immediately on every tap.

If the state had been `false` when Request 1 completed, a follow-up Request 2
would automatically be sent with `false`.

### Basic usage

```dart
class ItemCubit extends Cubit<ItemState> {
  ItemCubit() : super(ItemState());

  void toggleLike(String itemId) {
    await optimisticSync<bool>(
      key: ('toggleLike', itemId),

      // The value to apply optimistically (toggle current state).
      valueToApply: () => !state.items[itemId].isLiked,

      // How to apply the value to state.
      applyOptimisticValueToState: (state, isLiked) =>
          state.copyWith(items: state.items.setLiked(itemId, isLiked)),

      // How to read the value from state (for follow-up detection).
      getValueFromState: (state) => state.items[itemId].isLiked,

      // Send the value to the server.
      sendValueToServer: (isLiked) async {
        await api.setLiked(itemId, isLiked);
        return null;
      },
    );
  }
}
```

### How it works

1. **Always applies optimistic update**: Every call updates the UI immediately,
   even when another request is in flight.

2. **Single in-flight request per key**: Only one request runs at a time per key.
   The first dispatch acquires a lock and sends the request.

3. **Automatic follow-up**: When a request completes, it checks if the state changed
   while in flight. If so, it sends a follow-up request with the current value.

4. **No unnecessary requests**: If the state changed but returned to the same value
   (e.g., user toggled twice), no follow-up is needed.

5. **State stabilization**: When the state matches what was sent, the lock is released
   and `onFinish` is called.

### Required parameters

```dart
await optimisticSync<bool>(
  // Key for coalescing concurrent requests.
  // Use a record to make it unique per item.
  key: ('toggleLike', itemId),

  // Returns the value to apply optimistically.
  valueToApply: () => !state.items[itemId].isLiked,

  // Applies the optimistic value to state.
  applyOptimisticValueToState: (state, isLiked) =>
      state.copyWith(items: state.items.setLiked(itemId, isLiked)),

  // Extracts the value from state (for follow-up detection).
  getValueFromState: (state) => state.items[itemId].isLiked,

  // Sends the value to the server.
  sendValueToServer: (isLiked) async {
    await api.setLiked(itemId, isLiked);
    return null; // or return server-confirmed value
  },
);
```

### Applying the server response

If your server returns a value (e.g., the confirmed state), you can apply it
when the state stabilizes:

```dart
await optimisticSync<bool>(
  key: ('toggleLike', itemId),
  valueToApply: () => !state.items[itemId].isLiked,
  applyOptimisticValueToState: (state, isLiked) =>
      state.copyWith(items: state.items.setLiked(itemId, isLiked)),
  getValueFromState: (state) => state.items[itemId].isLiked,

  sendValueToServer: (isLiked) async {
    var response = await api.setLiked(itemId, isLiked);
    return response.liked; // Server-confirmed value
  },

  // Apply server response when state stabilizes.
  applyServerResponseToState: (state, serverResponse) {
    var serverLiked = serverResponse as bool;
    return state.copyWith(items: state.items.setLiked(itemId, serverLiked));
  },
);
```

The server response is only applied when the state stabilizes (no pending changes).
This prevents the server response from overwriting subsequent user interactions.

### Handling completion and errors

Use `onFinish` to run code when synchronization completes:

```dart
await optimisticSync<bool>(
  key: ('toggleLike', itemId),
  valueToApply: () => !state.items[itemId].isLiked,
  applyOptimisticValueToState: (state, isLiked) =>
      state.copyWith(items: state.items.setLiked(itemId, isLiked)),
  getValueFromState: (state) => state.items[itemId].isLiked,
  sendValueToServer: (isLiked) async {
    await api.setLiked(itemId, isLiked);
    return null;
  },

  // Called when synchronization completes.
  onFinish: (optimisticValue, error) async {
    if (error != null) {
      // Request failed. Options:
      // 1. Reload from server to restore correct state
      var reloaded = await api.getItem(itemId);
      return state.copyWith(items: state.items.update(itemId, reloaded));

      // 2. Or rollback to initial state if still matches
      // if (getValueFromState(state) == optimisticValue) {
      //   return applyOptimisticValueToState(state, !optimisticValue);
      // }
    }
    return null; // Success, no state change needed
  },
);
```

Important notes about `onFinish`:

- On success, it runs after the state is stable (no pending changes)
- On failure, it runs immediately after the request fails
- The lock is released *before* `onFinish` runs
- If it returns a non-null state, that state is applied

### Key differences from other features

**vs Debounce**:

- Debounce waits for inactivity before sending *any* request
- OptimisticSync sends the first request immediately and coalesces subsequent changes

**vs NonReentrant**:

- NonReentrant aborts subsequent dispatches entirely
- OptimisticSync applies the optimistic update and queues a follow-up request

**vs OptimisticCommand**:

- OptimisticCommand is for one-time commands (create, delete, submit)
- OptimisticSync is for rapid toggling where only the final state matters
- OptimisticCommand has automatic rollback; OptimisticSync uses `onFinish`

### When to use OptimisticCommand instead

Use `optimisticCommand` when the action is a **command** — something you want to
run on the server once per call:

* Create something (add todo, create comment, send message)
* Delete something
* Submit a form

In commands, each dispatch should result in a server operation. `optimisticCommand`
provides automatic rollback and is non-reentrant by design.

### Complete example

```dart
class SettingsCubit extends Cubit<SettingsState> {
  SettingsCubit() : super(SettingsState());

  void toggleDarkMode() {
    await optimisticSync<bool>(
      key: 'darkMode',

      valueToApply: () => !state.isDarkMode,

      applyOptimisticValueToState: (state, isDarkMode) =>
          state.copyWith(isDarkMode: isDarkMode),

      getValueFromState: (state) => state.isDarkMode,

      sendValueToServer: (isDarkMode) async {
        await api.updateSettings(darkMode: isDarkMode);
        return null;
      },

      onFinish: (optimisticValue, error) async {
        if (error != null) {
          // Reload settings from server on error
          var settings = await api.getSettings();
          return state.copyWith(isDarkMode: settings.isDarkMode);
        }
        return null;
      },
    );
  }
}
```
