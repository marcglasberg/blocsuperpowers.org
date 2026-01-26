---
title: Showing error dialogs
description: How to automatically show error dialogs or toasts when a Cubit method fails.
sidebar:
  order: 4
---

Suppose you want to show an error dialog or toast whenever a Cubit method fails.

This can be done by simply adding one of the provided widgets `UserExceptionDialog`
or `UserExceptionToast` right below the `MaterialApp` widget. For example:

```dart
Widget build(BuildContext context) {
  return Superpowers(
    child: BlocProvider<MyCubit>(
      create: (_) => MyCubit(),
      child: MaterialApp(
        home: UserExceptionDialog( // Here!
          showErrorsOneByOne: true,
          child: const HomePage(),
        ),
      ),
    );
  }
}
```

Now, whenever a Cubit throws a `UserException`, an error dialog (or toast) will be shown
with the exception message. Parameter `showErrorsOneByOne` makes sure that if multiple
errors happen at the same time, they will be shown one after the other, instead of all
at once.

You can customize the dialog or toast appearance by providing your own error widget.
Just inspect the code of the `UserExceptionDialog` to see how is works and create
your own version.
