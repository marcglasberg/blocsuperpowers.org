---
title: Optimistic command
description: How to apply optimistic state changes immediately, then run the command on the server with optional rollback.
sidebar:
  order: 13
---

The `optimisticCommand` method is for actions that represent a **command** — something
you want to run on the server once per call. Typical examples are:

* Create something (add todo, create comment, send message)
* Delete something
* Submit a form
* Upload a file
* Checkout, place order, confirm payment

This function gives fast UI feedback by applying an optimistic state change immediately,
then running the command on the server, and optionally rolling back and reloading if
the command fails.

### The problem

Let's use a Todo app as an example. We want to save a new Todo to a TodoList.
This code saves the Todo, then reloads the TodoList from the cloud:

```dart
class TodoCubit extends Cubit<TodoState> {
  TodoCubit() : super(TodoState());

  void addTodo(Todo newTodo) {
    // Save the new Todo to the cloud.
    await api.saveTodo(newTodo);

    // Load the complete TodoList from the cloud.
    var reloadedTodoList = await api.loadTodoList();
    emit(state.copyWith(todoList: reloadedTodoList));
  }
}
```

The problem with this code is that it may take a second to update the todoList
on screen, while we save then load.

### The solution

The `optimisticCommand` function solves this by:

1. Applying the change immediately (optimistically)
2. Sending the command to the server
3. If the server fails, rolling back to the previous state
4. Optionally reloading from the server

```dart
class TodoCubit extends Cubit<TodoState> {
  TodoCubit() : super(TodoState());

  void addTodo(Todo newTodo) {
    await optimisticCommand(
      key: (AddTodo, newTodo.id),

      // The optimistic value to apply immediately.
      optimisticValue: () => state.todoList.add(newTodo),

      // How to read the value from state (for rollback comparison).
      getValueFromState: (state) => state.todoList,

      // How to apply a value to state.
      applyValueToState: (state, value) =>
          state.copyWith(todoList: value as IList<Todo>),

      // The server command.
      sendCommandToServer: (optimisticValue) async {
        await api.saveTodo(newTodo);
        return null;
      },
    );
  }
}
```

Now the user sees the new todo immediately. If saving fails, it's automatically
rolled back.

### How it works

1. **Non-reentrant check**: If the same key is already running, abort.
2. **Capture initial state**: Store the current value for potential rollback.
3. **Apply optimistic value**: Update the UI immediately.
4. **Send command to server**: Execute the server operation.
5. **On success**: Optionally apply the server response to state.
6. **On failure**: Check if rollback is safe, then restore initial value.
7. **Finally**: Optionally reload from server.

### Required parameters

```dart
await optimisticCommand(
  // Key for state tracking and non-reentrant protection.
  // Use a record to make it unique per item.
  key: (AddTodo, newTodo.id),

  // Returns the value to apply optimistically.
  optimisticValue: () => state.todoList.add(newTodo),

  // Extracts the relevant value from state.
  // Used to check if rollback is safe.
  getValueFromState: (state) => state.todoList,

  // Applies a value to state and returns the new state.
  // Used for both optimistic update and rollback.
  applyValueToState: (state, value) => state.copyWith(todoList: value as IList<Todo>),

  // Sends the command to the server.
  // Return a value to apply it via applyServerResponseToState.
  sendCommandToServer: (optimisticValue) async {
    await api.saveTodo(newTodo);
    return null; // or return the server response
  },
);
```

### Applying the server response

If your server returns the saved entity (with server-generated fields like ID or
timestamps), you can apply it to the state:

```dart
await optimisticCommand(
  key: (AddTodo, newTodo.clientId),

  optimisticValue: () => state.todoList.add(newTodo),

  getValueFromState: (state) => state.todoList,

  applyValueToState: (state, IList<Todo> value) => state.copyWith(todoList: value),

  sendCommandToServer: (optimisticValue) async {
    // Server returns the saved todo with server-generated ID.
    var savedTodo = await api.saveTodo(newTodo);
    return savedTodo; // Pass to applyServerResponseToState
  },

  // Apply the server response to state.
  applyServerResponseToState: (state, serverResponse) {
    var savedTodo = serverResponse as Todo;

    // Replace the optimistic todo with the server-confirmed one.
    return state.copyWith(
      todoList: state.todoList
        .where((t) => t.clientId != newTodo.clientId).toIList()
        .add(savedTodo),
    );
  },
);
```

### Reloading from server

If you want to reload the data from the server after the command completes
(typically on failure), implement `reloadFromServer`:

```dart
await optimisticCommand(
  key: (AddTodo, newTodo.id),
  optimisticValue: () => state.todoList.add(newTodo),
  getValueFromState: (state) => state.todoList,
  applyValueToState: (state, value) =>
      state.copyWith(todoList: value as IList<Todo>),
  sendCommandToServer: (optimisticValue) async {
    await api.saveTodo(newTodo);
    return null;
  },

  // Reload from server (called on error by default).
  reloadFromServer: () async {
    return await api.loadTodoList();
  },
);
```

By default, reload only happens on error. Override `shouldReload` to change this:

```dart
// Always reload, even on success.
shouldReload: ({
  required currentValue,
  required lastAppliedValue,
  required optimisticValue,
  required rollbackValue,
  required error,
}) => true,
```

### Customizing rollback behavior

By default, rollback happens only if the current state still matches the optimistic
value. This prevents rolling back over newer changes that happened while the request
was in flight.

Override `shouldRollback` for custom behavior:

```dart
// Always rollback on error, even if something else changed.
shouldRollback: ({
  required currentValue,
  required initialValue,
  required optimisticValue,
  required error,
}) => true,
```

Override `rollbackState` to customize what state is restored:

```dart
// Keep the item but mark it as failed instead of removing it.
rollbackState: ({
  required state,
  required initialValue,
  required optimisticValue,
  required error,
}) => state.copyWith(
  todoList: state.todoList.map((t) =>
    t.id == newTodo.id ? t.copyWith(status: TodoStatus.failed) : t
  ).toIList(),
),
```

### Non-reentrant behavior

`optimisticCommand` is always non-reentrant. If the same key is already running,
subsequent calls are aborted. This prevents:

* Conflicting optimistic updates overwriting each other
* Incorrect rollback behavior
* Race conditions in the reload phase
* Server-side conflicts from concurrent requests

By default, the key is used for both state tracking and non-reentrant protection.
Use `nonReentrantKey` if you need different keys:

```dart
await optimisticCommand(
  key: AddTodo, // For isWaiting/isFailed tracking
  nonReentrantKey: (AddTodo, newTodo.id), // For non-reentrant protection
  ...
);
```

This allows `addTodo('A')` and `addTodo('B')` to run concurrently, while blocking
concurrent calls to `addTodo('A')` with itself.

### Showing loading state

Your UI should indicate when a command is in progress:

```dart
Widget build(BuildContext context) {
  var isSaving = context.isWaiting((AddTodo, todoId));

  return ElevatedButton(
    onPressed: isSaving ? null : () => cubit.addTodo(newTodo),
    child: isSaving
        ? CircularProgressIndicator()
        : Text('Add Todo'),
  );
}
```

### When to use OptimisticSync instead

Use `optimisticSync` when the action is a **save operation**, meaning only the
final value matters and intermediate values can be skipped. Typical examples are:

* Like or follow toggle
* Settings switch
* Slider, checkbox
* Update a field where the last value wins

In save operations, users may tap many times quickly. `optimisticSync` is built
for that and will coalesce rapid changes into a minimal number of server calls.
`optimisticCommand` is not built for that — each call is a separate command.

### Complete example

```dart
class TodoCubit extends Cubit<TodoState> {
  TodoCubit() : super(TodoState());

  void deleteTodo(String todoId) {
    await optimisticCommand(
      key: (DeleteTodo, todoId),

      // Remove the todo optimistically.
      optimisticValue: () =>
          state.todoList.where((t) => t.id != todoId).toIList(),

      getValueFromState: (state) => state.todoList,

      applyValueToState: (state, value) =>
          state.copyWith(todoList: value as IList<Todo>),

      sendCommandToServer: (optimisticValue) async {
        await api.deleteTodo(todoId);
        return null;
      },

      // Reload on error to ensure consistency.
      reloadFromServer: () async => await api.loadTodoList(),
    );
  }
}
```
