# termanul
### create command line applications on the web with xterm.js

![termanul](https://media.discordapp.net/attachments/850595806045405228/1168381045217955940/image.png?ex=65518ea4&is=653f19a4&hm=a7c2a708ebb6bea3826bceaca6328646ef1b42b5093f603d7b66007d788cb086&=&width=901&height=375)

termanul is a REPL, and small shell-like scripting enviroment for xterm.js implemented with async JS.

## logic

creating web UIs to manage resources is difficult, UIs typically don't offer much interoperability with one and another, and the process is incredibly time consuming. 
on the other hand... command line applications are easier to write, faster, and provide interoperability with one and another.

so I guess you can create "managment consoles" with this.

## features

I'd like to preface this by saying that this isn't a "real" development enviroment. Termanul exists to call thinly mapped JS functions that interface with your backend. Though whith that in mind, it's scripting abilities are strong enough to implement some degree of control flow... though I would advise against it. If you need to store a script, use the ".manul" extension ig. 

### a functional REPL

the REPL behaves like bash and supports most of the keyboard shortcuts you are used to. This includes a ctrl-c which will reject (terminate) the highest item on the interpreter's callstack. Though the ctrl-c handler tends to crash nested commands within loops since I don't think JS handles it very well.

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

working on making it more reliable by refactoring some code, but you can `await interpreter.exec()` commands. and get the return value as a JSON object.
 
## limitations

it's written in JS. Any blocking code will brick your entire tab. Any "blocking" operation needs to be handled via async operations. 
 
## install

to install download the most recent versions of `xterm-addon-canvas`, `xterm-addon-fit`, `xterm-addon-web-links`, `xterm-addon-webgl` and `xterm.js` and place in the `dependancides` folder. you need to host the contents of `src` on some sort of webserver, just viewing the file locally will not work. See `termanul.html` for a basic example implementation.

## future considerations

as I use this in other projects I will probably add onto it... though if someone more competant would like to help improve the core codebase that'd be much appreciated as I think it needs a massive refactor.
