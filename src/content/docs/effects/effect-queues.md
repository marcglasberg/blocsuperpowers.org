---
title: Effect Queues
description: How to use effect queues to trigger multiple side effects in sequence from your Cubits.
sidebar:
  order: 2
---

Effect queues allow you to trigger multiple side effects in a sequence.
The Cubit emits a list of values, and the widget provides a handler
that interprets each value, keeping UI concerns in the UI layer.

It ensures the proper order of UI operations like showing a toast,
then a dialog, then navigating. You can choose between executing all effects
in one frame in order, or one per frame.

By using effects queues and [effects](./effects),
you don't need to use `BlocListener` anymore.


#### Define your UI effects

Use a sealed class to define the possible UI effects (no UI code here):

```dart
sealed class UiEffect {}

class ShowToast extends UiEffect {
  final String message;
  ShowToast(this.message);
}

class ShowDialog extends UiEffect {
  final String title;
  final String content;
  ShowDialog(this.title, this.content);
}

class Navigate extends UiEffect {
  final String route;
  Navigate(this.route);
}
```

#### In your state

```dart
class AppState {
  final EffectQueue<UiEffect> effectQueue;

  AppState({EffectQueue<UiEffect>? effectQueue})
      : effectQueue = effectQueue ?? EffectQueue.spent();

  AppState copyWith({EffectQueue<UiEffect>? effectQueue}) =>
      AppState(effectQueue: effectQueue ?? this.effectQueue);
}
```

#### In your Cubit (clean, no UI code)

The Cubit describes **what** should happen using effect objects. It has no knowledge
of how toasts, dialogs, or navigation work:

```dart
void triggerSequentialEffects() {
  emit(state.copyWith(
    effectQueue: EffectQueue<UiEffect>(
      [
        Navigate('/success'),
        ShowToast('Welcome!'),
        ShowDialog('Info', 'You have arrived.'),
      ],
      (remaining) => emit(state.copyWith(effectQueue: remaining)),
    ),
  ));
}
```

#### In your widget (handler interprets effects)

The widget decides **how** to execute each effect:

```dart
Widget build(BuildContext context) {

  context.effectQueue<AppCubit, UiEffect>(
    // Select the effect queuefrom state
    (cubit) => cubit.state.effectQueue,

    (context, effect) => switch (effect) {
      // Handle showing a toast
      ShowToast(:final message) =>
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message))),

      // Handle showing a dialog
      ShowDialog(:final title, :final content) =>
        showDialog(
          context: context,
          builder: (_) => AlertDialog(title: Text(title), content: Text(content)),
        ),

      // Handle navigation
      Navigate(:final route) =>
        Navigator.of(context).pushNamed(route),
    },
  );

  return MyContent();
}
```

#### One per frame vs all at once

By default, `onePerFrame` is `true`, meaning each effect executes in a separate frame:

1. Effect 1 runs → triggers rebuild
2. Effect 2 runs → triggers rebuild
3. Effect 3 runs → done

If you set `onePerFrame: false`, all effects execute in order in a single frame:

```dart
context.effectQueue<AppCubit, UiEffect>(
  (cubit) => cubit.state.effectQueue,
  (context, effect) => switch (effect) { ... },
  onePerFrame: false,  // All effects run in one frame
);
```

This is useful when you don't need visual separation between effects.
