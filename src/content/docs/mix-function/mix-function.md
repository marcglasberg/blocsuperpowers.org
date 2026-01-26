---
title: Wrap with mix
description: How to use the mix function.
sidebar:
  order: 1
---

Consider a Cubit with one or more methods:

```dart
class UserCubit extends Cubit<User> {
  UserCubit() : super(User());

  void loadData() {
    // Load something         
  }

  void saveData() {
    // Save something         
  }
}
```

We start by wrapping our Cubit methods with the `mix` function provided by the Bloc Superpowers package.
The only required parameters are a unique `key` and the action callback:

```dart
class UserCubit extends Cubit<User> {
  UserCubit() : super(User());

  void loadData() => mix(
    key: this,
    () async {
      // Load something
    }           
  );

  void saveData() => mix(
    key: this,
    () async {
      // Save something
    }         
  );
}
```
    
&nbsp;

These are all valid ways to use the `mix` function, depending on what you want to return from the action callback:

```dart
// Arrow function syntax
void doSomething() => mix(
  key: this,
  () async { ... }           
);
```
```dart
// Arrow function syntax returning a Future<void>
Future<void> doSomething() => mix(
  key: this,
  () async { ... }           
);
```
```dart
// Arrow function syntax returning a Future<int>
Future<void> doSomething() => mix(
  key: this,
  () async { 
    ...
    return 42; 
  }           
);
```
```dart
// Block function syntax
void doSomething() {
  mix(
    key: this,
    () async { ... }
  ); 
);
```
```dart
// Block function syntax returning a Future
Future<void> doSomething() async {
  await mix(
    key: this,
    () async { ... }
  ); 
);
```
         
## Parameters

The mix function also accepts several optional parameters that add powerful features to your Cubit methods.
Here are all of them used together, with their default values:

```dart
void doSomething() {
  mix(
    key: this,
    retry: retry, 
    nonReentrant: nonReentrant,
    checkInternet: checkInternet,
    fresh: fresh,
    debounce: debounce,
    throttle: throttle,
    sequential: sequential,
    config: config,
    () async {
      // Do something
    }
  ); 
}
```

In the next pages, let's see how each of these parameters work in detail.
