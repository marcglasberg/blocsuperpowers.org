---
title: Overview
---

## The `mix` function

Suppose you have a Cubit like this:

```dart
class UserCubit extends Cubit<User> {
  UserCubit() : super(User());

  void loadData() {
    // Do something
  }
}
```

Wrap the Cubit method with the `mix` function, and give it a `key`:

```dart
class UserCubit extends Cubit<User> {
  UserCubit() : super(User());

  void loadData() => mix(      
    key: this,
    () {
      // Do something.
    });  
}
```

### Loading and error states

There is no need to add `isLoading` and `error` variables to your state anymore.

Just load what you want to load, and throw an error if something fails:

```dart
class UserCubit extends Cubit<User> {
  UserCubit() : super(User());

  void loadData() => mix(
    key: this, 
    () async {
      var user = await api.loadUser();
      if (user == null) throw UserException('Failed to load');
      emit(user);
    });
  } 
}
```

Then, use `isWaiting()` and `isFailed()` in your widgets:

```dart
class MyWidget extends StatelessWidget {
  
  Widget build(BuildContext context) {
    if (context.isWaiting(UserCubit)) return CircularProgressIndicator();
    if (context.isFailed(UserCubit)) return Text('Error loading');
    return Text('Loaded: ${context.watch<UserCubit>().state}');
  }
}
```

### Error dialog

To show error dialogs when your Cubit methods throw errors,
add a `UserExceptionDialog` widget below your `MaterialApp`:

```dart
return MaterialApp(
  home: UserExceptionDialog( // Or use UserExceptionToast          
    child: const HomePage(),
  ),        
);
```

## Mix parameters

### Retry

To retry a failed method with exponential backoff,
add `retry: retry` to the `mix` function.

```dart
class UserCubit extends Cubit<User> {
  UserCubit() : super(User());

  void loadData() => mix(
    key: this,
    retry: retry, // Here!
    () { 
      // Do something 
    });  
}
```

Modify its behavior with optional parameters:

```dart
mix(
  key: this,
  retry: retry(maxRetries: 10, initialDelay: 350.millis, multiplier: 2, maxDelay: 5.sec),
  ...
```

### Non Reentrant

Use `nonReentrant: nonReentrant` to prevent a method to run more than once simultaneously.

```dart
mix(
  key: this,
  nonReentrant: nonReentrant,
  ...
```

### Check Internet

Use `checkInternet: checkInternet` to
abort the method if there is no internet connection,
and show an error dialog to the user.

```dart
void loadData() {
  mix(
    key: this,    
    checkInternet: checkInternet,
    ...
```

Modify its behavior with optional parameters:

```dart
mix(
  key: this,
  checkInternet: checkInternet(abortSilently: true, ifOpenDialog: false),
  ...
```

To keep retrying until the internet comes back, combine it with `retry.unlimited`.
This is great for loading important data when the app starts:

```dart
mix(
  key: this,
  checkInternet: checkInternet(maxRetryDelay: 1.sec),
  retry: retry.unlimited,
  ...
```

### Fresh

Use `fresh: fresh` to treat the result of a method as _fresh_ for some time.
Repeated calls to the method are skipped, until the period ends and the method
is allowed to run again.

```dart
void loadData() {
  mix(
    key: this,    
    fresh: fresh, // Default is 1 second of freshness
    ...
```

Modify its behavior with optional parameters:

```dart
mix(
  key: this,
  fresh: fresh(freshFor: 10.sec),
  ...
```

For example, when you enter a screen it loads some information.
When you quickly leave and re-enter the screen, the information is still valid.
Only if you leave for a longer time, the information will be reloaded when you return.

### Debounce

Use `debounce: debounce` so that a method will only execute after it stops being called
for some time.

```dart
void loadData() {
  mix(
    key: this,    
    debounce: debounce, // Default is 300 milliseconds
    ...
```

For example, if you type "hello" quickly, instead of 5 API calls
(for "h", "he", "hel", "hell", "hello"), only one call is made after the user
stops typing for 300 milliseconds.

Modify its behavior with optional parameters:

```dart
mix(
  key: this,
  debounce: debounce(duration: 2.sec),
  ...
```

### Throttle

Use `throttle: throttle` to rate-limit a method.
The first call executes immediately,
but next calls are aborted until the throttle period ends.

```dart
void loadData() {
  mix(
    key: this,    
    throttle: throttle, // Default is 1 second 
    ...
```

This is useful for things like refresh buttons, scroll handlers, or API polling.

Modify its behavior with optional parameters:

```dart
void refreshPosts({bool force = false}) {
  mix(
    key: this,
    throttle: throttle(ignoreThrottle: force, removeLockOnError: true, duration: 5.sec),
    ...
  );
}
```

With this setup:

* `refreshPosts()` respects the throttle period.
* `refreshPosts(force: true)` executes immediately and resets the throttle timer.

### Sequential

Use `sequential: sequential` to force method calls to execute one at a time, in order.

```dart
void processOrder(Order order) {
  mix(
    key: this,
    sequential: sequential, // Queue orders and process one at a time
    ...
}
```

By default, the queue size is unlimited and there is no timeout,
but you can add limits with optional parameters:

```dart
mix(
  key: this,
  sequential: sequential(maxQueueSize: 10, queueTimeout: 30.sec),
  ...
```

By default, when the queue is full or items time out, **newer** method calls are dropped.

You can instead enforce a "latest wins" semantics,
so that older calls are dropped,
and only the newest waiting call is kept in the queue.

```dart
mix(
  key: this,
  sequential: sequential.latestWins,
  ...
```

This is useful for things like processing user actions
where only the latest action matters.

---

## How keys work

The `mix` function has a main `key` parameter that identifies the action:

```dart
class UserCubit extends Cubit<User> {
  UserCubit() : super(User());

  void loadData() => mix(      
    key: this, // Here!
    () {
      // Do something.
    });  
}
```

If you use `key: this`, this is the same as writing `key: runtimeType`,
which in the above example is the same as writing `key: UserCubit`.

In your widgets you can then use `context.isWaiting(UserCubit)` and `context.isFailed(UserCubit)`:

```dart
class MyWidget extends StatelessWidget {
  
  Widget build(BuildContext context) {
    if (context.isWaiting(UserCubit)) return CircularProgressIndicator();
    if (context.isFailed(UserCubit)) return Text('Error');
    return Text('Loaded: ${context.watch<UserCubit>().state}');
  }
}
```

The key can also be a string:

```dart
// In the Cubit
mix(      
  key: 'someKey', // Here!
  ...  

// In the widget
if (context.isWaiting('someKey')) return CircularProgressIndicator();
if (context.isFailed('someKey')) return Text('Error');
```

The key can also be an enum value:

```dart
enum ActionType { loadUser, saveSettings }

// In the Cubit
mix(      
  key: ActionType.loadUser, // Here!
  ...
  
// In the widget
if (context.isWaiting(ActionType.loadUser)) return CircularProgressIndicator();
if (context.isFailed(ActionType.loadUser)) return Text('Error');
```

The key can also be a Dart record:

```dart
class UserCubit extends Cubit<User> {
  UserCubit() : super(User());

  void loadUser(String userId) => mix(      
    key: (LoadUser, userId), // Here!
    () {
      // Do something.
    });  
}
  
// In the widget
if (context.isWaiting((LoadUser, userId))) return CircularProgressIndicator();
if (context.isFailed((LoadUser, userId))) return Text('Error');
``` 

### Override keys

You can use more than one key to achieve different granularity for different features,
since `retry`, `fresh`, `debounce`, `throttle`, and `sequential` all accept their own `key` parameter:

```dart
void loadUser(String userId) {
  mix(
    key: UserCubit, // State tracking uses UserCubit
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

In this example, `context.isWaiting(UserCubit)` tracks whether any load is in progress,
but loading user "A" doesn't affect the freshness of user "B"
         
---

## Advanced Features

* You can customize the default configurations globally for your app. Example:

  ```dart
  RetryConfig.defaults = retry(
    maxRetries: 5,
    initialDelay: 200.millis,
    multiplier: 2.0,
    maxDelay: 10.sec,
  );
  ```

* You can use the `mix.ctx` function to have access to internal information,
  such as the current retry attempt number or sequential queue position. Example:

  ```dart  
  mix.ctx( // Instead of `mix`
    key: this,                         
    retry: retry,
    sequential: sequential,
    (ctx) async { // We have access to `ctx` 
      var attempt = ctx.retry!.attempt,     
      var wasQueued = ctx.sequential!.wasQueued;    
      var index = ctx.sequential!.index;   
      ...
    },  
  ```  

* If you add a `catchError` param to your `mix` function, you can handle errors there.
  You can suppress errors, rethrow them, or wrap them in user-friendly exceptions:

```dart
// Log and suppress all errors
mix(
  key: this,
  catchError: (error, stackTrace) {
    logError(error, stackTrace);      
  },
  ...

// Log and rethrow all errors
mix(
  key: this,
  catchError: (error, stackTrace) {
    logError(error, stackTrace);
    throw error; // Respects the original stack trace
  },
  ...

// Wrap all errors in a UserException
mix(
  key: this,
  catchError: (error, stackTrace) {
    // Respects the original stack trace
    throw UserException('Operation failed').addCause(error);
  },
  ...
```

* You can create predefined configurations that you can reuse.

  ```dart
  // Check internet, retry, and log start/finish/error messages       
  const checkInternetRetryAndLog = MixConfig(
    checkInternet: checkInternet,
    retry: retry,
    before: () => Log.info("Starting"),
    after: () => Log.info("Finished"),
    catchError: (error, stackTrace) => Log.error("Failed", error),
  );
                                                                         
  // Later, use it in the `config` parameter
  mix(
    key: this,
    config: checkInternetRetryAndLog, // Here!
    ...
  ```

---

## Presets

Instead of using the `mix` function directly,
you can create and use your own reusable functions by defining a **preset**.

For example, here is a function that checks the internet, retries up to five times,
and logs when the function starts, finishes, or fails. It also wraps all errors in a `UserException`.

```dart
// Define once
const checkInternetRetryAndLog() = MixPreset(
  key: key,
  checkInternet: checkInternet,
  retry: retry(maxRetries: 5),
  before: () => Log.info("Starting"),
  after: () => Log.info("Finished"),
  catchError: (error, stackTrace) {
    logError(error);
    throw UserException('Operation failed').addCause(error);
  },
);
```

Use it like this:

```dart
void fetchUsers() {
  checkInternetRetryAndLog( // Here!
    key: this,    
    () async {
      final users = await api.getUsers();
      emit(state.copyWith(users: users));
    },
  );
}
```

---

## The optimistic functions

The Superpowers package comes with three functions for optimistic UI updates.
They all allow you to update the UI immediately while sending changes to the server.
Depending on what happens in the server call, they can roll back changes,
reload from the server, or send follow-up requests.

* `optimisticCommand` is for **blocking** operations that represent a **command**,
  something you want to run on the server once per call.

* `optimisticSync` is for **non-blocking** operations where only the final value matters
  and intermediate values can be skipped, with eventual consistency with the server.

* `optimisticSyncWithPush` is similar to `optimisticSync` but supports
  **server-pushed updates** and multi-device writes with "last write wins" semantics.

To use these functions, you have to provide some easy-to-implement callbacks,
and the functions take care of the rest, doing the complex optimistic logic for you.

This is an example implementation for you to get the gist of it:

```dart
class TodoCubit extends Cubit<TodoState> {
  TodoCubit() : super(TodoState());

  void addTodo(Todo newTodo) {
    await optimisticCommand(
      key: (AddTodo, newTodo.id),
      optimisticValue: () => state.todoList.add(newTodo),
      getValueFromState: (state) => state.todoList,
      applyValueToState: (state, value) => state.copyWith(todoList: value as IList<Todo>),
      sendCommandToServer: (optimisticValue) async {
        await api.saveTodo(newTodo);
        return null;
      },
    );
  }
}
```

---

## Effects

Effects are one-time notifications stored in your state, used to trigger side effects in
widgets such as showing dialogs, clearing text fields, or navigating to new screens.
They replace `BlocListener`, but are much easier to use.

Effects are automatically "consumed" (marked as spent) after
being read, ensuring they only trigger once. 
They can be consumed directly in the `build` method of your widgets,
using `context.effect()`.

To demonstrate, pretend your Cubit needs to be able to clear a text field and change its text.
We declare two effects in the state, `clearEffect` and `changeTextEffect`:

```dart
// In your state
class UserState {
  final User? user;
  final Effect<bool> clearEffect; // Here!
  final Effect<String> changeTextEffect; // Here!
  
  UserState(this.user, Effect<bool>? clearEffect, Effect<String>? changeTextEffect)
    : clearEffect = clearEffect ?? Effect.spent(),
      changeTextEffect = changeTextEffect ?? Effect.spent();
      
  UserState copyWith({ ... });
}

// In your Cubit method, create new effects with `Effect()`
void clearText() => emit(state.copyWith(clearEffect: Effect(true)));
void changeText(String newText) => emit(state.copyWith(changeTextEffect: Effect(newText)));

// In your widget, use `context.effect`
Widget build(BuildContext context) {

  var clear = context.effect((UserCubit c) => c.state.clearEffect);
  if (clear) controller.clear();
  
  var newText = context.effect((UserCubit c) => c.state.changeTextEffect);
  if (newText != null) controller.text = newText;
  
  return TextField(controller: controller);
}
```

## EffectQueue

Effect queues allow you to trigger multiple side effects in a sequence.  
The Cubit emits a list of values, and the widget provides a handler
that interprets each value.

It ensures the proper order of UI operations like showing a toast,
then a dialog, then navigating.
You can even choose between executing all effects in one frame in order, or one per frame.

First, define the possible UI effects:

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

Your state must have a list of effects:

```dart
class AppState {
  final EffectQueue<UiEffect> effectQueue;
  ...
```

Your Cubit describes what should happen using the `UiEffect` objects:

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

In your widget, use `context.effectQueue` to execute the effects:

```dart
Widget build(BuildContext context) {

  context.effectQueue<AppCubit, UiEffect>(
    
    // Select the queue  
    (cubit) => cubit.state.effectQueue,
    
    // Process all effects at once (in order) or one per frame
    onePerFrame: true, 
    
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

  return Text('My App');
}
```

## List of features
   
And, that's it! Here is a summary of all the features provided by the Superpowers package:

* `context.isWaiting()`: Use it to show spinners or loading indicators when a Cubit is
  loading. No need to add explicit loading states to your Cubits anymore.

* `context.isFailed()`: Show error messages when a Cubit has failed. No need to add
  explicit error states and error messages to your Cubits anymore.

* `UserException`: A Cubit that fails can now just throw exceptions.

* `UserExceptionDialog` and `UserExceptionToast`: Widgets that shows an error dialog or
  toast when a Cubit throws a UserException.

* `retry`: Easily retry failed Cubit methods.

* `checkInternet`: Check for internet connectivity before executing Cubit methods.

* `nonReentrant`: Prevent Cubit methods from being called simultaneously.

* `sequential`: Queue Cubit method calls and process them one after another, in order.

* `fresh`: Treat Cubit methods as fresh for some time. Prevent reloading data too often.

* `debounce`: Debounce Cubit method calls to avoid rapid successive calls.

* `throttle`: Throttle Cubit method calls to limit how often they can be called.

* `catchError`: Suppress errors, rethrow them, or wrap them in user-friendly exceptions.

* `MixConfig`: Create reusable configurations for the `mix` function.

* `MixPreset`: Create your own reusable `mix` functions.

* `optimisticCommand`: Applying an optimistic state change immediately, then run the
  command on the server, optionally rolling back and reloading.

* `optimisticSync`: Update the UI immediately and send the updated value to the server,
  making sure the server and the UI are eventually consistent.

* `optimisticSyncWithPush`: Similar to optimisticSync, but resilient to server-pushed
  updates that may modify the same state this action controls.

* `Effect`: Class that allows Cubits to emit one-time effects to the UI,
  such as navigation events, dialogs, toasts. Replaces `BlocListener`.

* `EffectQueue`: Class that allows Cubits to emit queued one-time effects to the UI,
  ensuring they are shown one after the other.
