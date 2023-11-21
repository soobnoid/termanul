# termanul
### create command line applications on the web with xterm.js

![termanul](https://github.com/soobnoid/termanul/assets/149321534/d37b8fe5-4b13-4414-8b31-05376c442728)

termanul is a REPL, and small shell-like scripting enviroment for xterm.js implemented with async JS.

## logic

Command line applications are easy to write and "clean"... though they cannot interact with dynamic web content. Similarly, web content cannot easily display pty output. termanul is a complete PTY scripting enviroment running within the browser. Thus, command line utilities written in it can access your pages DOM, and can wrap around your API much more thinly than a traditional GUI. Similarly, since XtermJs is a full PTY you can attach other terminal sessions over websockets if you want.  

## features

I'd like to preface this by saying that this isn't a "real" development enviroment. Termanul exists to call thinly mapped JS functions that interface with your backend. Though whith that in mind, it's scripting abilities are strong enough to implement some degree of control flow... though I would advise against it. 

If you need to store a script, use the .manul extension I guess. 

### a functional REPL

the REPL behaves like bash and supports most of the keyboard shortcuts you are used to. This includes a ctrl-c which will reject (terminate) the highest item on the interpreter's callstack. Though the ctrl-c handler tends to crash outer commands within nested loops.

### a shell-like scripting enviroment.

see `manulscript.md` for more details. Though I must reiterate, I think this tool is best used when complex commands are invoked simply through one-liners.

### built in opt parser.

you can create commands to pass to interpreters like so. All opts are parsed as JSON and then type checked.

```
let cmds = 
{
    test: {
        opts:{
            help:createOpt(
                ["h","H"],
                ["help"],
                "none",
                "help opt description"
            )
        },
        callback: async (cmd, app, term) => {
            term.write("test command called\r\n");
            return 0;
        },
        desc : "test command\r\n"
    },

    shug: {
        opts: {
            foo:createOpt(
                ["f","F"],
                ["foo"],
                "num",
                "foo opt"
            )
        },
        callback: async (cmd, app, term) => {
            term.write("shug " + cmd.foo + " \r\n");
            return 1;
        },
        desc : "another test command\r\n"
    }
}
```

which translates to 

```
termanul >>> test --foo
long opt 'foo' not recognized
parse error
undefined
termanul >>> test -H
test command called
0
termanul >>> shug --foo 234234
shug 234234 
1
termanul >>> for (manul = {echo 1 2 3 4}) {test; shug --foo &{manul}; test}
test command called
shug 1 
test command called
test command called
shug 2 
test command called
test command called
shug 3 
test command called
test command called
shug 4 
test command called
0
```

### readline()

it can handle I/O via async calls. see the `read` command implementation.
 
### invokation from js.

while it's not the most reliable you can `await interpreter.exec()` commands and get the return value as an object. 
 
## limitations

it's written in JS. Any blocking code will brick your entire tab. Any "blocking" operation needs to be handled via async operations. 
 
## install

to install download the most recent versions of `xterm-addon-canvas`, `xterm-addon-fit`, `xterm-addon-web-links`, `xterm-addon-webgl` and `xterm.js`, create the folder `src/dependancies` and place the files there. also grab `xterm.css` and place it in `src/css` like in the previous step.

## future considerations

as I use this in other projects I will probably add onto it... anyone who wants to contribute is welcome. 
