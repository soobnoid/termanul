# manulscript

the whole thing is pretty WIP, so I'm writing this with the assumption that the reader already knows how to program.

basically termanul is split into two parts... the REPL, which handles I/O, and the interpreter which runs commands. The interpreter works by lexing the line passed to it, and splitting each whitespace seperated string or value enclosed by a grouping symbol `()/[]/{}`. `;` starts a new line, which will be executed after the one before it. the result of an interpreter operation will always be the return value of the last line.

Technically you can only execute one command at once, but builtin commands like `for` and `map` bypass this restriction by recursively invoking the interpreter/dereferencer and using lazy inlining. When inlining the interpreter also recursively invokes itself. Since return values/variables are stored as JS objects so "piping" (in the powershell sense... we aren't actually passing IO handles) is relatively easy.   

## inlining

it works like it does in bash... more self invokation.

you may perform both direct and `lazy` substitutions with the `inline` operators `$` (direct) and `&` (lazy). both `inline` operators should be immediatly followed by either `{}` or `()`. `{}` will inline a reference, `()` will inline a command. The only difference between the two operators is that the lazy (`&`) inliner will only inline if it is not within a grouping symbol. Other than the more contrived example below, this is to enable commands like `for` to reassign the inlined reference on each loop iteration.

ex:
```
termanul >>> write {&(test)}
{&(test)}
undefined
termanul >>> write {$(test)}

test command called
{0}
undefined
```

## references/enviromental variables

`references` are invoked with the `inline` operators and will substitue the value of the variable. References may additionally use the `=` operator to assign the variable a valid JSON object. all untaken names in the root namespace (no `.` operators) are `null` until initialized. The entire namespace directly maps back to the js namespace. 

## *

the `*` command does nothing... it is for when you want to inline only for side effect, like if you want to assign a variable but do nothing with it. 

## infix commands

you may define infix/ternary commands which are executed if they are the second token of the line, with the preceding token becoming a special `left` argument. All args after that are treated normally.

```
termanul >>> * ${manul = {"manuls":["polly", "lev"]}}
undefined
termanul >>> write ${manul}
{"manuls":["polly","lev"]}
```

```
termanul >>> map (manul = {echo 0 0 0 0 0}) {read --in "manul "}
manul polly
manul bol
manul lev
manul az
manul nar
["polly","bol","lev","az","nar"]
```

```
termanul >>> write $(str &(read --in "manul "))
manul polly
"polly"
```

```
termanul >>> for (manul = {echo 0 0 0 0}) {write &(read --in "manul ")}
manul polly
polly
manul lev
lev
manul az
az
manul nar
nar
```

```
termanul >>> for (manul = {echo 0 0 0 0}) {test; test; test}
test command called
test command called
test command called
test command called
test command called
test command called
test command called
test command called
test command called
test command called
test command called
test command called
0
```

you may also invoke scripts with `await interpreter.exec("echo cmd", term)`, though side effects may make that a bad idea. Making this more reliable is a top priority.

## TOOO 
### more documentation.


