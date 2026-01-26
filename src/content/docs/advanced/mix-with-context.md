---
title: Mix with context
description: How to use mix.ctx to access runtime information like retry attempt number.
sidebar:
  order: 12
---

The `mix.ctx` function is identical to `mix`, but passes a `MixContext` object to the
action callback. Use it when you need access to runtime information, such as the current
retry attempt number or queue position.

### Basic usage

```dart
void loadData() {
  mix.ctx( // Instead of `mix`
    key: this,
    (ctx) async { // Here we now have access to `ctx`
      ...
    },
  );
}
```

### Retry context

`ctx.retry` is non-null only when the `retry` param is used.
It provides access to the current retry attempt:

* **`attempt`**: The number of retry attempts so far (0-based).
  On the initial attempt it's 0, after the first retry it's 1, etc.

* **`config`**: The retry configuration with fields
  `maxRetries`, `initialDelay`, `multiplier`, and `maxDelay`.

```dart
void loadData() {
  mix.ctx(
    key: this,
    retry: retry(maxRetries: 5),
    (ctx) async {
      var retryInfo = ctx.retry!;
      print('Attempt ${retry.attempt + 1} of ${retry.config.maxRetries + 1}');
      var data = await api.loadData();
      emit(data);
    },
  );
}
```

### Sequential context

`SequentialContext` provides access to queue status information:

* **`wasQueued`**: `true` if this call had to wait in the queue before executing, `false`
  if it executed immediately.

* **`index`**: The position in the queue when the call was added. `0` means it executed
  immediately (no calls ahead), `1` means one call was ahead, etc.

* **`config`**: The resolved sequential configuration (`ResolvedSequentialConfig`).

```dart
void sendMessage(String chatId, String message) {
  mix.ctx(
    key: this,
    sequential: sequential(key: (ChatCubit, chatId)),
    (ctx) async {
      var sequential = ctx.sequential!;
      if (sequential!.wasQueued) print('Message queued at ${sequential.index}');
      await api.sendMessage(chatId, message);
    },
  );
}
```

### Other contexts

The other context types provide access to their configurations:

* `ctx.nonReentrant.config`
* `ctx.throttle.config`
* `ctx.debounce.config`
* `ctx.fresh.config`
* `ctx.checkInternet.config`

### When to use mix.ctx vs mix

Use `mix` for most cases — it's simpler and sufficient when you don't need the context.
