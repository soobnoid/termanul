# termanul
### create command line applications on the web with xterm.js

termanul is a REPL, and small shell-like scripting enviroment for xterm.js implemented with async JS.

## logic

creating web UIs to manage resources is difficult, UIs typically don't offer much interoperability with one and another, and the process is incredibly time consuming. 
on the other hand... command line applications are easier to write, faster, and provide interoperability with one and another.

so I guess you can create "managment consoles" with this.

## features

I'd like to preface this by saying that this isn't a "real" development enviroment. Termanul exists to call thinly mapped JS functions that interface with your backend. Though whith that in mind, it's scripting abilities are strong enough to implement some degree of control flow... though I would advise against it. If you need to store a script, use the ".manul" extension ig. 

### a functional REPL

the REPL behaves like bash and supports most of the keyboard shortcuts you are used to. This includes a ctrl-c which will reject (terminate) the highest item on the interpreters callstack.

### a shell-like scripting enviroment.

ex:

```
```

see `manulscript.md` for more details.

### built in opt parser.

```
```

### readline()

it can handle I/O via async calls.
 
## limitations

it's written in JS. Any blocking code will brick your entire tab. Any "blocking" operation needs to be handled via async operations. 
 
## install

to install download the most recent versions of `xterm-addon-canvas`, `xterm-addon-fit`, `xterm-addon-web-links`, `xterm-addon-webgl` and `xterm.js` and place in the `dependancides` folder. see `termanul.html` for a basic example implementation.

