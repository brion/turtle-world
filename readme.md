# Turtle World

Turtle World is a Logo interpreter and turtle graphics environment for the web.

**TURTLE WORLD IS INCOMPLETE. USE AT YOUR OWN RISK.**

See [on-web demo page](https://brionv.com/misc/turtle-world/) to try it out so far.

It is intended for use in interactive programming theory demos on the web. Currently it is more or less functional but incomplete. Needs cleanup in the engine, parser, and standard library, and to have hooks added to support interactive program flow visualization and debugging.

Currently it requires an ES2017-level browser engine with support for `async`/`await` and modules for direct loading, or without modules for `require` usage through a Node bundler. It can probably be transpiled further to support ES5 (IE 11) but this is not currently a priority.

The Logo engine may be used in Node.js as well without the turtle graphics component.

# Introduction

[Logo](https://en.wikipedia.org/wiki/Logo_(programming_language)) is a LISP-based language, with the primary datatypes:
* linked lists
* words (strings)
* numbers
* booleans

Procedure definitions look something like this:

```
to factorial :n
    ; No infix operators currently.
    ; Use the prefix commands for comparisons and arithmetic.
    if greaterp :n 0 [
        ; Each procedure's argument length is known at
        ; interpretation time, so this is unambiguous.
        output product :n factorial difference :n 1
    ]
    output 1
end
```

# Divergences from traditional Logos

These details may change...

Lists and instruction arguments may span across newlines, which are treated the same as spaces. Closing parentheses and brackets are required.

Infix operators are not yet implemented. Use procedure operations like `sum` and `product` for arithmetic.

Variables and procedures share a common namespace.

Procedures may be created inside a procedure.

Lexical scoping (not dynamic), except that blocks executed via 'if' etc run in the caller's scope.

# Syntax

* comments: start with `;`
* lists: `[` ... `]`
* words: `foo` with no quotes is tokenized to a string, interpreted as a command name in instruction lists
    * a `:` prefix on a word `:foo` marks it as a variable, equivalent to calling `thing "foo"` in execution
    * a `"` prefix on a word `"foo` marks it as a string literal in instruction lists
    * may use `\` as an escape character for spaces and delimiters
* numbers: floating point, pos or neg, exponents ok
* booleans: use the `true` and `false` operations
* commands: lists that contain sequences of procedure names as words, quoted and numeric literals, and lists
* the special form `to` ... `end` in top-level code creates a procedure

## Operators

There are currently no infix operators like `:a + :b` so you must use the equivalent prefix operations like `sum :a :b`. These are intended to be added in a parser update.

## Accessors

Variable and procedure names are "passed by reference" by quoting their names, as in:

```
; set variable atari to number 400
make "atari 400

; prints 400
print thing "atari
```

To get variable values, a shortcut `:` prefix can be used as a shortcut for `thing`:

```
; let's go big
make "atari sum :atari 400

; prints 800
print :atari
```

## Expressions

Executable expressions are themselves lists, in the form of a name for a procedure call (looked up in current or lexical parent scope) and zero or more argument values, which themselves may be the outputs of procedure calls.

Expressions may be wrapped in parentheses to explicitly demarcate argument list boundaries, or they may be implicitly derived from the declared procedure's number of arguments.

For instance this series of instructions:

```
output product :n factorial difference :n 1
```

runs as would the explicitly demarcated form:

```
(output (product :n (factorial (difference :n 1))))
```

Since it's unknown before execution whether a procedure call will return a value (an "operation") or not (a "command"), this is checked at runtime after execution. If a missing return value was expected as input to another call's argument, this will cause an error.

## Instruction lists

Some commands and operations take blocks of code as instruction lists, which are interpreted like a procedure body. Usually list literals in source code are used to write instruction lists, but you could create them at runtime through list manipulation procedures.

For instance the `if` command takes a block to execute if the condition is true:

```
if equalp :a :b [
    print [the same]
]
```

Currently the blocks are executed in the same scope and context as the function that called the block-using operation to allow local variable access and local `output` and `stop` commands:

```
forever [
    dostuff ; may alter vars
    if greaterp :a :b [
        print [the same, now exiting]
        ; We need the value of "a" inside the block
        output :a
    ]
]
```

The scoping rules may change to more traditional Logo dynamic scope rules where locals are exposed to called procedure scopes.

# Internals

## Execution model

Logo code is presented with a synchronous, single-threaded execution model, but the interpreter and all builtin procedures are implemented as JavaScript `async` functions. Logo commands may thus wait on timers, promises, or other async operations without blocking the event loop.

This also allows control flow to be introspected, visualized, and debugged interactively on the web through a hook system.

## Lists

Lists are implemented as instances of the `List` class.

Lists are proper singly-linked lists. Each `List` record is either empty, or contains a `head` value. Every record has a `tail` pointer, which is either a non-empty list record or the empty list.

Only one instance of an empty list is allowed, exposed as `List.empty`. Beware that `List.empty.tail === List.empty`. Circular references other than the empty identity are forbidden, and may cause things to break.

Modifying a list record's contents is possible from JS code, but currently not exposed to Logo code. In JS code, forward building of lists (which requires modifying the tail pointers) should be done through the ListBuilder class for convenience.

## Procedures

Procedures ("commands" that don't return a value, and "operations" that do return a value) are represented as JavaScript `async function` objects.

For built-ins implemented in JS, the functions represent themselves; user-defined Logo procedures are wrapped in a closure function which calls back into the interpreter.

The number of arguments exposed in the `length` property is used to determine how many arguments to parse, so be careful about using optional parameters and rest parameters.

Note that for the closure definition, the `length` property must be overridden manually based on the declared arguments in the Logo procedure definition, as the JS anonymous function uses a rest arg.

Whether a procedure returns a value or not affects interpretation of Logo instruction lists, so be consistent! An empty `return` or `return undefined` will be counted as not producing output. Any other value will be returned as output.

## Errors

Error conditions are modeled as JS exceptions. Internal code may throw an exception, and this will cause Logo execution to halt and clean up the interpreter stack. It's up to the calling/embedding code to catch and present those exceptions in a useful way.

Currently there is no attempt to make the error messages traditionally Logo-y.

It would be possible to add `throw`/`catch`/`finally` support at the Logo level modeled on UCBLogo, but this has not yet been done.

# Security

Logo code may call any JavaScript function that is passed in and bound as a variable value. If you do not wish this to happen, don't give it functions.

There are no limits on memory usage for strings, lists, variable and procedure bindings, etc. It may be possible for Logo code to overuse memory, which may cause a crashed tab or Node process.

It's possible for Logo code to hog the main loop and prevent input, timers etc from running if there are no actual asynchronous operations called during a `repeat` or `forever` loop. Embedders may prevent this by forcing an event-loop bounce with `setTimeout` or `postMessage` in the `oncall` or `onliteral` callbacks.

# Open projects

See [open projects on GitHub](https://github.com/brion/turtle-world/projects/1).

# References

* [Atari Logo reference manual](https://archive.org/details/AtariLOGOReferenceManual)
* [Atari logo web emulator](https://archive.org/details/a8b_cart_Atari_LOGO_1983_Atari)
* [UCBLogo user manual](https://people.eecs.berkeley.edu/~bh/usermanual)
