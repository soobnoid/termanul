# manulscript

the whole thing is pretty wip, so I'm writing this with the assumption that the read already knows how to program.

to see how the builtin commands are implemented look at `shell.js` all builtins are simple and written with readable code, commands are passed to the interpreter as objects, which are then invoked. Most builtins recursively invoke the parser on tokenized expressions, tokens are parsed and split by whitespace, excluding anything wrapped in (), [], or {}, and strings wrapped in '"' and "'". tokens are parsed by line. each line can be cut short by a semicolon (;), and may only contain one command. most "builtins" will remove the grouping symboles within tokens and attempt to execute what's inside. also, with this in mind, as of right now... the parser does not care which grouping symbols you use to tokenize you symbols except when you are inlining (see below).

you may also `inline`, or by invoking `$` and `&`. `$` does a first-pass inline and runs the command and substitutes the output, and `&` only inlines when the token is parsed in scope, aka when it is not within any grouping symbols. In practice this makes little difference except for commands like `for` and `map` that take commands as arguments, where we want to dereference a symbol after assignment on each round.

when inlining with `()` you invoke a command, when inlining with `{}`

I made a few basic "builtins" that demonstrate some basic functionality. 

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

you may also invoke scripts with `await interpreter.exec("echo cmd", term)`, though side effects may make that a bad idea. Making this more reliable is a top priority. Also I feel as though I shouldn't have to mention this, but do not try running a command when another callstack is active.

## TOOO 
### more documentation.

