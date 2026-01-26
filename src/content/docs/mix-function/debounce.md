---
title: Debounce
description: How to debounce Cubit method calls to avoid rapid successive calls.
sidebar:
  order: 9
---

The `debounce` parameter delays the execution of a method until after a certain period
of inactivity. Each time the debounced method is called, the wait time resets.

The method will only execute after it stops being called for the duration of the wait
time. This is useful when you want to ensure a method is not called too frequently.

For example, it's commonly used for handling search-as-you-type in text fields, where you
don't want to search every time the user presses a key, but rather after they've stopped
typing for a certain amount of time.

### Basic usage

```dart
class SearchCubit extends Cubit<SearchState> {
  SearchCubit() : super(SearchState());

  void search(String query) {
    mix(
      key: this,
      debounce: debounce(duration: 300.millis), // Wait 300ms after last keystroke
      () async {
        var results = await api.search(query);
        emit(state.copyWith(results: results));
      }
    );
  }
}
```

In this example, if the user types "hello" quickly, instead of making 5 API calls
(one for "h", "he", "hel", "hell", "hello"), only one call is made after the user
stops typing for 300 milliseconds.

### How debounce keys work

By default, when you pass `key: this` to `mix`, the key is the Cubit's `runtimeType`.
This means all calls from the same Cubit type share the same debounce period.

If you want different debounce periods for different parameters, use a record as the key:

```dart
class SearchCubit extends Cubit<SearchState> {
  SearchCubit() : super(SearchState());

  void searchInCategory(String category, String query) {
    mix(
      key: this,

      // Each category has its own debounce period
      debounce: debounce(key: (SearchCubit, category), duration: 300.millis),

      () async {
        var results = await api.searchInCategory(category, query);
        emit(state.copyWith(results: results));
      }
    );
  }
}
```

Now searching in "books" and "movies" categories won't interfere with each other's
debounce timers.

### Configuring the debounce duration

The `duration` value is a `Duration`. The default is 300 milliseconds.

```dart
// Wait 500ms after last call
debounce: debounce(duration: 500.millis),

// Wait 1 second after last call
debounce: debounce(duration: 1.sec),
```

### How it differs from throttle

**Debounce** waits for quiet time:

- If you call a method 10 times in quick succession, only the **last** call executes,
  after the quiet period.

- Use debounce for search-as-you-type, form validation, window resize handlers.

**Throttle** rate-limits execution:

- If you call a method 10 times in quick succession, only the **first** call executes,
  and subsequent calls are ignored until the throttle period expires.

- Use throttle for scroll handlers, refresh buttons, API polling.
