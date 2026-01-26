---
title: Sequential
description: How to queue Cubit method calls and process them one after another, in order.
sidebar:
  order: 16
---

The `sequential` parameter queues method calls and processes them one after another.
Unlike `nonReentrant` which drops subsequent calls, `sequential` ensures every call
eventually executes, in the order they were made.

This is equivalent to the `sequential()` EventTransformer from the `bloc_concurrency`
package, but for Cubit methods.

### Basic usage

```dart
class OrderCubit extends Cubit<OrderState> {
  OrderCubit() : super(OrderState());

  void processOrder(Order order) {
    mix(
      key: this,
      sequential: sequential, // Queue orders and process one at a time
      () async {
        await api.processOrder(order);
        emit(state.copyWith(processedOrders: [...state.processedOrders, order]));
      }
    );
  }
}
```

In this example, if you call `processOrder` three times quickly with orders A, B, and C:

1. Order A starts processing immediately
2. Orders B and C are queued
3. When A completes, B starts processing
4. When B completes, C starts processing
5. All three orders are eventually processed, in order

### When to use sequential vs nonReentrant

**Use `sequential`** when every call matters and must eventually execute:

- Processing a queue of orders
- Sending messages in a chat (order matters, none should be dropped)
- Applying a series of mutations that must all happen
- Any operation where dropping calls would cause data loss

**Use `nonReentrant`** when only one execution matters and duplicates can be ignored:

- Loading data (multiple load requests can be deduplicated)
- Refreshing a view (only one refresh needed)
- Any operation that's idempotent and can be safely skipped

### How sequential keys work

By default, when you pass `key: this` to `mix`, the key is the Cubit's `runtimeType`.
This means all calls from the same Cubit type share the same queue.

If you want separate queues for different parameters, use a record as the key:

```dart
class ChatCubit extends Cubit<ChatState> {
  ChatCubit() : super(ChatState());

  void sendMessage(String chatId, String message) {
    mix(
      key: this,

      // Each chat has its own queue
      sequential: sequential(key: (ChatCubit, chatId)),

      () async {
        await api.sendMessage(chatId, message);
        emit(state.copyWith(/* ... */));
      }
    );
  }
}
```

Now messages to chat "A" and chat "B" can be sent concurrently (different queues),
but messages within the same chat are always sent in order.

### Limiting the queue size

By default, the queue is unlimited. If you want to limit how many calls can be queued,
use `maxQueueSize`. When the queue is full, new calls are dropped (like `nonReentrant`):

```dart
void processOrder(Order order) {
  mix(
    key: this,
    sequential: sequential(maxQueueSize: 10), // Max 10 pending orders
    () async {
      await api.processOrder(order);
    }
  );
}
```

With `maxQueueSize: 10`:

- If 10 orders are already queued (plus 1 processing), new calls are dropped
- This prevents unbounded memory growth from rapid calls
- Dropped calls behave like `nonReentrant` — they return immediately without executing

### Timeout for queued calls

You can set a timeout for how long a call can wait in the queue before being discarded:

```dart
void processOrder(Order order) {
  mix(
    key: this,
    sequential: sequential(queueTimeout: 30.sec), // Max 30 seconds in queue
    () async {
      await api.processOrder(order);
    }
  );
}
```

With `queueTimeout: 30.sec`:

- If a queued call waits longer than 30 seconds, it's discarded
- The discarded call does not execute and does not throw an error
- This prevents stale operations from executing much later than intended

### Drop oldest behavior

By default, when the queue is full (`maxQueueSize` exceeded), **new calls are dropped**.
This is the safest behavior for most use cases where you don't want to lose older work.

However, some use cases benefit from the opposite behavior: **dropping the oldest waiting
call** to make room for the newest one. This provides "latest wins" semantics while still
maintaining sequential execution.

```dart
void loadDetails(String itemId) {
  mix(
    key: this,
    sequential: sequential(
      maxQueueSize: 1,
      dropOldest: true, // Drop oldest waiting call, keep newest
    ),
    () async {
      final details = await api.loadDetails(itemId);
      emit(state.copyWith(details: details));
    }
  );
}
```

**Use cases for `dropOldest: true`:**

- **User navigation/selection**: User taps items A, B, then C quickly. With
  `dropOldest: true`, the system processes A (running), supersedes B, and processes C.
  This follows the user's latest intent.

- **Real-time data refresh**: When refreshing data, only the most recent refresh request
  matters. Older pending refreshes can be safely discarded.

- **Form auto-save**: With rapid edits, you want to save the latest state, not queue up
  every intermediate state.

- **Resource loading**: When loading resources based on user selection, only the latest
  selection matters.

**How it works:**

1. Call A starts executing
2. Call B arrives and is queued (1 in queue)
3. Call C arrives and queue is full:
    - With `dropOldest: false` (default): C is dropped, B executes after A
    - With `dropOldest: true`: B is superseded, C executes after A

**Shortcut: `sequential.latestWins`**

The combination of `maxQueueSize: 1` and `dropOldest: true` is common enough to have its
own shortcut:

```dart
// These are equivalent:
sequential(maxQueueSize: 1, dropOldest: true)
sequential.latestWins

// Can be chained with other options:
sequential.latestWins(key: 'myKey')
sequential(queueTimeout: 5.sec).latestWins
```

This is similar to `bloc_concurrency`'s `restartable()`, but safer:

- `restartable` aborts the currently running task when a new event arrives
- `latestWins` lets the running task complete, only supersedes waiting calls

### Combining sequential with other parameters

Sequential can be combined with `retry` for robust queue processing:

```dart
void sendMessage(String chatId, String message) {
  mix(
    key: this,
    sequential: sequential(key: (ChatCubit, chatId)),
    retry: retry, // Retry failed messages before moving to next
    () async {
      await api.sendMessage(chatId, message);
    }
  );
}
```

When combined with retry:

- If a call fails, it retries (according to retry settings) before the next queued call
  starts
- This ensures reliable delivery while maintaining order

Sequential can also be combined with `checkInternet`:

```dart
void syncData(Data data) {
  mix(
    key: this,
    sequential: sequential,
    checkInternet: checkInternet,
    retry: retry.unlimited,
    () async {
      await api.syncData(data);
    }
  );
}
```

### How it differs from debounce

**Sequential** processes every call, one at a time:

- If you call a method 10 times quickly, all 10 calls execute (in order)
- Use sequential when every call represents a distinct operation

**Debounce** waits for inactivity and runs only the last call:

- If you call a method 10 times quickly, only the last call executes
- Use debounce for search-as-you-type where intermediate values don't matter

### Summary of sequential options

```dart
sequential(
  key: null,           // Override key for queue isolation (default: uses mix key)
  maxQueueSize: null,  // Max queued calls before dropping (default: unlimited)
  queueTimeout: null,  // Max time a call can wait in queue (default: unlimited)
  dropOldest: false,   // When true, drops oldest waiting call instead of newest when full
)

// Shortcut for maxQueueSize: 1, dropOldest: true
sequential.latestWins
```
