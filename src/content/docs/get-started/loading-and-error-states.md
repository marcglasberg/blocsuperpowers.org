---
title: Loading and Error states
description: Learn how to use the Bloc Superpowers package with the mix function.
sidebar:
  order: 3
---

Consider a Cubit that loads user information from an API.
Without Superpowers, you would typically have a state like this:

```dart
class UserState {
  final User? user;
  final bool isLoading;
  final String? errorMessage;

  UserState({this.user, this.isLoading = false, this.errorMessage});

  UserState copyWith({User? user, bool? isLoading, String? errorMessage}) {
    return UserState(
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

class UserCubit extends Cubit<UserState> {
  UserCubit() : super(UserState());

  void loadData() {
    emit(state.copyWith(isLoading: true, errorMessage: null));

    try {
      final user = await api.loadUser();
      if (user == null) {
        emit(state.copyWith(isLoading: false, errorMessage: 'Failed to load user'));
        return;
      }

      emit(state.copyWith(user: user, isLoading: false, errorMessage: null));
    } catch (e) {
      emit(state.copyWith(isLoading: false, errorMessage: e.toString()));
    }
  }
}
```

Now let's see how this simplifies with Superpowers.
First, we won't be needing fields like `isLoading` or `errorMessage` anymore,
which simplifies our state:

```dart
class UserState {
  final User? user;
  UserState({this.user});

  MyState copyWith({User? user}) => MyState(user: user ?? this.user);
}
```

In this simple case, we can even skip the state class entirely and just use `User`
as the Cubit state.

Finally, we wrap our Cubit method `loadData` with the `mix` function
provided by the Superpowers package, and git it a **key**.

The key is a very powerful feature, as I'll explain later.
It can be anything, but the easiest key to use it is to simply provide `key: this`,
which uses the Cubit's `runtimeType` as the key.

```dart
class UserCubit extends Cubit<User> {
  UserCubit() : super(User());

  void loadData() {
    mix(
      key: this, // Here!
      () async {
        var user = await api.loadUser();
        if (user == null) throw UserException('Failed to load user');
        emit(user);
      }
    );
  }
}
```

Note above that when the user fails to load (user is `null`),
it simply throws a `UserException`.
Throwing a `UserException` when something goes wrong is allowed and encouraged.
It will not create any problems,
as the `mix` function will catch it internally and deal with it.

Now, we can use `isWaiting()` and `isFailed()` in the widgets:

```dart
class MyWidget extends StatelessWidget {

  Widget build(BuildContext context) {
    if (context.isWaiting(UserCubit)) return CircularProgressIndicator();
    if (context.isFailed(UserCubit)) return Text('Error loading');
    return Text('Loaded: ${context.watch<UserCubit>().state}');
  }
}
```

The widget above will rebuild automatically when the `loadData` method of the
`UserCubit` starts, and then once again when it finishes (either successfully or with
failure). While it's running, `context.isWaiting(UserCubit)` returns `true`,
so you can show a loading indicator. If it fails, `context.isFailed(UserCubit)` will
return `true`, so you can show an error message.

There are two extra context extensions you should know about.
First, `context.getException(UserCubit)` allows you to get the user exception
thrown by the Cubit, so that you can show its message:

```dart
if (context.isFailed(UserCubit))
  return Text('Error: ${context.getException<UserCubit>()}');
```

The second extension is `clearException()`, which allows you to clear
the exception state of the Cubit, so that `context.isFailed(UserCubit))`
returns `false` again.
You usually don't need this,
because it will be cleared automatically as soon as the Cubit method
is called and starts executing again.
