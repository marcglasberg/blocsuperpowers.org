---
title: Effects
description: How to emit one-time effects from Cubits to trigger UI actions like dialogs, toasts, and navigation.
sidebar:
  order: 1
---

Effects are one-time notifications stored in your state, used to trigger side effects in
widgets such as showing dialogs, clearing text fields, or navigating to new screens.

Unlike regular state values, effects are automatically "consumed" (marked as spent) after
being read, ensuring they only trigger once.

By using effects and [effect queues](./effect-queues),
you don't need to use `BlocListener` anymore.

### Basic usage with a value-less effect

```dart
// In your state
class AppState {
  final Effect clearEffect;
  AppState({Effect? clearEffect}) : clearEffect = clearEffect ?? Effect.spent();

  AppState copyWith({Effect? clearEffect}) =>
      AppState(clearEffect: clearEffect ?? this.clearEffect);
}

// In your Cubit method, create a new effect
void clearText() {
  emit(state.copyWith(clearEffect: Effect()));
}

// In your widget, use `context.effect`
Widget build(BuildContext context) {
  var clear = context.effect((AppCubit c) => c.state.clearEffect);
  if (clear) controller.clear();
  return TextField(controller: controller);
}
```

### Usage with a typed effect

Effects can carry a value of any type:

```dart
// In your state
class AppState {
  final Effect<String> messageEffect;
  AppState({Effect<String>? messageEffect}) : messageEffect = messageEffect ?? Effect.spent();
}

// In your Cubit method
void showMessage(String message) {
  emit(state.copyWith(messageEffect: Effect(message)));
}

// In your widget
Widget build(BuildContext context) {
  final state = context.watch<AppCubit>().state;
  final message = state.messageEffect.consume();
  if (message != null) showSnackBar(context, message);
  return MyContent();
}
```

### Return values

The `consume()` method returns different values depending on the effect type:

- **For effects with no generic type** (`Effect`): Returns `true` if the effect is new,
  or `false` if spent.

- **For effects with a value type** (`Effect<T>`): Returns the value if the effect is new,
  or `null` if spent.

### Effect states

You can check the effect state without consuming it:

```dart
effect.isSpent      // true if consumed
effect.isNotSpent   // true if not yet consumed
effect.state        // returns the value without consuming
```

### Important notes

- Effects are consumed only once. After consumption, they are marked as "spent".
- Each effect can be consumed by **one single widget**.
- Always initialize effects as spent: `Effect.spent()` or `Effect<T>.spent()`.
- The widget will rebuild when a new effect is created, even if it has the same internal
  value as a previous effect, because each effect instance is unique.

### How effect equality works

Effects use a custom equality check to ensure correct rebuild behavior:

- **Unspent effects** are never considered equal to any other effect, ensuring widgets
  always rebuild when a new effect is dispatched.

- **Spent effects** are all considered equal to each other, since they are "empty" and
  should not trigger rebuilds.

This behavior is essential for Bloc's state comparison to work correctly with effects.

