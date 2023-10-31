// ANSI codes

const CSI = "\u001b["
const CRLF = "\r\n";
const cls  = "\u000c";
        
const HOME = CSI + "H"

const CURSOR_HIDE = CSI + "?25l";
const CURSOR_SHOW = CSI + "?25h";
        
const LINE_WRAP         = CSI + "7h";
const REVERSE_LINE_WRAP = CSI + "45h";

const ERASE_LINE = CSI + "2K";
            
const UPKEY    = CSI + "A";
const DOWNKEY  = CSI + "B";
const RIGHTKEY = CSI + "C";
const LEFTKEY  = CSI + "D";
        
const CTRL_UP    = CSI + "1;5A";
const CTRL_DOWN  = CSI + "1;5B";
const CTRL_RIGHT = CSI + "1;5C";
const CTRL_LEFT  = CSI + "1;5D";
            
const CURSOR_SAVE    = CSI + "s"
const CURSOR_RESTORE = CSI + "u"

const PAGE_UP   = CSI + "5~";
const PAGE_DOWN = CSI + "6~";

const PREV_LINE = CSI + "F";
const NEXT_LINE = CSI + "E";

class XtermJsInstance
{
    constructor (container, options) 
    {

        if(!options) 
        {
            options = {
                cursorBlink:"block",
                fontFamily : 'Fira Code Nerd Font',
                fontSize : 20,
                scrollback: 99999999, // this is the recomended
                                      // way to do infinite scrollback
                theme: {
                        background: '#2f374f',
                }
            };
        }

        this.container = container;

        this.term = new Terminal(options);
        
        this.term.open(container);
        this.term.write(LINE_WRAP);

        // set webgl as default renderer and browser
        // canvas as backup... avoid the default 
        // dom renderer (slow) by default.

        let webgl = new WebglAddon.WebglAddon();
        let canvas = null;
        
        let term = this.term;

        webgl.onContextLoss((e) =>
            {
                webgl.dispose();
                webgl = null;
                canvas = new CanvasAddon.CanvasAddon();
                term.loadAddon(canvas);
            }
        );

        container.addEventListener("webglcontextrestored", (e) => 
            {
                if(canvas)
                {
                    canvas.dispose();
                    canvas = null;
                } 

                if(!webgl) 
                {
                    webgl = new WebglAddon.WebglAddon();
                }

                term.loadAddon(webgl);
            },
            false
        );

        term.loadAddon(webgl);
        
        let linksAddon = new WebLinksAddon.WebLinksAddon();
        this.term.loadAddon(linksAddon);
        linksAddon.activate(this.term);
    }
    
    getCols () {return this.term.cols;}
    getRows () {return this.term.rows;}

    onData (ev) {this.term.onData(ev);} 

    write (val) {this.term.write(val);}

    readLine(prompt) 
    {
        return new Promise ((resolve, reject) => 
            {
                if(!this.repl) {reject("REPL not initialized for pty");}
                if(this.repl.ioHandler) {reject("io handler already active");}
                this.repl.IOprompt = prompt;
                this.repl.ioHandler = resolve;
                this.repl.showLine();
            },
        );
    }
}

// let fitAddon = new FitAddon.FitAddon();

function addXtermJsResizeHandler(instance, repl)
{
    let fitAddon = new FitAddon.FitAddon();
    instance.term.loadAddon(fitAddon);

    // fitAddon.proposeDimensions().cols

    instance.autofit = (e) => {
        repl.clearLine();
        instance.term.resize(
            fitAddon.proposeDimensions().cols,
            Math.floor(
                instance.container.offsetHeight / 
                (instance.term.element.clientHeight / instance.getRows())
            )
        );
        repl.showLine();
    };
}

const visibleAndWhitespaceChars = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~\t\n\r";
const blackList = new RegExp(`[^${visibleAndWhitespaceChars}]`, 'g');

function sanitize(inputString) 
{
    inputString = inputString.replace("\u001b", "^[");
    return inputString.replace(blackList, '');
}

class repl 
{

    constructor (app, term)
    {
        term.repl = this;

        this.ioHandler = null; // 
        this.io = false;       // are we in io mode (program running)?

        this.app  = app;
        this.term = term;

        this.history = [];
        this.historyIndex = [];

        this.lines = [];
        this.lineIndex = 0; 

        this.lineNum = 0;
        this.currLine = "";

        this.replHandler = (ev) => 
        {

            if(ev == "\u0003")
            {
                if(this.app.callstack.length > 0)
                {
                    term.write("^C" + CRLF);
                    this.app.callstack.pop().reject();
                }

                if(!this.io)
                {
                    this.resetLine();
                }

            }

            if(!this.io || this.ioHandler)
            {
                switch(ev)
                {
                    case "\u007f":
                        if(this.lineIndex > 0)
                        {
                            if(this.currLine.length)
                            {
                                this.clearLine();           
                                this.lineIndex --;
                            
                                this.currLine  = this.currLine.slice(0, this.lineIndex) + 
                                                this.currLine.slice(this.lineIndex + 1);
                            
                                this.showLine();
                            }
                        }
                        break;
            
                    case "\n":
                    case "\r":
                        if(this.ioHandler)
                        {
                            this.ioHandler(this.currLine);
                            this.ioHandler = null;
                            this.IOprompt = '';
                            this.currLine = '';
                            this.term.write(CRLF);
                        } 
                        else {run(this);}
                        break;
                
                    case cls:
                        if(!this.ioHandler)
                        {
                            this.term.write(CURSOR_HIDE);
                            this.term.write("\n".repeat(this.term.getRows() + 1));
                            this.term.write(UPKEY.repeat(this.term.getRows()));
                            this.term.write("\r");
                            this.resetLine();
                            this.term.write(CURSOR_SHOW);
                            this.showLine();
                        }
                        break;

                    case CTRL_UP:
                    case PAGE_UP:
                    case UPKEY:
                        if(!this.ioHandler)
                        {
                            if(this.app.historyIndex == -1) 
                            {
                                this.app.savedLine = this.currLine;
                            }
                            if(this.app.historyIndex < this.app.history.length - 1)
                            {
                                this.app.historyIndex ++;
                                this.term.write(CURSOR_HIDE);
                                this.clearLine();
                                this.resetLine();
                                this.currLine = this.app.history[this.app.historyIndex];
                                this.lineIndex = this.currLine.length - 1;
                                this.term.write(CURSOR_SHOW);
                                this.showLine();
                            }
                        }
                        break;
                
                    case CTRL_DOWN:
                    case PAGE_DOWN:
                    case DOWNKEY:
                        if(!this.ioHandler)
                        {
                            if(this.app.historyIndex > -1)
                            {
                                this.app.historyIndex --;

                                this.term.write(CURSOR_HIDE);
                                this.clearLine();
                                this.resetLine();

                                if(this.app.historyIndex == -1)
                                {
                                    if(this.app.savedLine)
                                    {
                                        this.currLine = this.app.savedLine
                                        this.lineIndex = this.currLine.length - 1;
                                        this.app.savedLine = "";
                                    }
                                }

                                else
                                {
                                    this.currLine = this.app.history[this.app.historyIndex];
                                    this.lineIndex = this.currLine.length - 1;
                                }

                                this.term.write(CURSOR_SHOW);
                                this.showLine();
                            }
                        }
                        break;
                
                    case LEFTKEY:
                        if(this.lineIndex > 0) 
                        {
                            this.term.write(CURSOR_HIDE);
                            this.clearLine();
                            this.lineIndex --;
                            this.showLine();
                            this.term.write(CURSOR_SHOW);
                        }
                        break;

                    case RIGHTKEY:  
                        if(this.lineIndex < this.currLine.length) 
                        {
                            this.term.write(CURSOR_HIDE);
                            this.clearLine();
                            this.lineIndex ++;
                            this.showLine();
                            this.term.write(CURSOR_SHOW);
                        }
                        break;
                
                    case CTRL_RIGHT:
                        if(this.lineIndex < this.currLine.length)
                        {
                            this.term.write(CURSOR_HIDE);
                            this.clearLine();
                            for(let i = this.lineIndex + 1; i <= this.currLine.length; i++) 
                            {
                                if(
                                   this.currLine[i] == ' ' ||
                                   this.currLine[i] == '{' ||
                                   this.currLine[i] == '}' ||
                                   this.currLine[i] == '[' ||
                                   this.currLine[i] == ']' ||
                                   this.currLine[i] == '(' ||
                                   this.currLine[i] == ')' ||
                                   this.currLine[i] == ':' ||
                                   this.currLine[i] == ';' ||
                                   this.currLine[i] == '.' ||
                                   this.currLine[i] == '"' ||
                                   this.currLine[i] == "'" ||
                                   i == this.currLine.length
                                  )
                                {
                                    this.lineIndex = i;
                                    if(i != this.currLine.length) {this.lineIndex++;}
                                    break;
                                }
                            }
                            this.showLine();
                            this.term.write(CURSOR_SHOW);
                        }
                        break;

                    case CTRL_LEFT:
                        if(this.lineIndex > 0)
                        {
                            this.term.write(CURSOR_HIDE);
                            this.clearLine();
                            for(let i = this.lineIndex - 2; i >= 0; i--) 
                            {
                                if(
                                   this.currLine[i] == ' ' ||
                                   this.currLine[i] == '{' ||
                                   this.currLine[i] == '}' ||
                                   this.currLine[i] == '[' ||
                                   this.currLine[i] == ']' ||
                                   this.currLine[i] == '(' ||
                                   this.currLine[i] == ')' ||
                                   this.currLine[i] == ':' ||
                                   this.currLine[i] == ';' ||
                                   this.currLine[i] == '.' ||
                                   this.currLine[i] == '"' ||
                                   this.currLine[i] == "'" ||
                                   i == 0
                                 )
                                {
                                    this.lineIndex = i;
                                    if(i != 0) {this.lineIndex++;}
                                    break;
                                }
                            }
                            this.showLine();
                            this.term.write(CURSOR_SHOW);
                        }

                        break;

                    case HOME:
                        this.clearLine();
                        this.lineIndex = 0;
                        this.showLine();
                        break;
                    
                    default:
                        this.clearLine();
                        ev = sanitize(ev);

                        this.currLine = this.currLine.slice(0, this.lineIndex) + 
                                        ev + this.currLine.slice(this.lineIndex);

                        this.lineIndex += ev.length;
                        this.showLine();
                }
            }
        }

        this.term.onData(this.replHandler);

        this.term.write(" ______                             __\r\n/_  __/__ ______ _  ___ ____  __ __/ /\r\n / / / -_) __/  ' \\/ _ `/ _ \\/ // / / \r\n/_/  \\__/_/ /_/_/_/\\_,_/_//_/\\_,_/_/\r\n")
        this.term.write("termanul JS repl 1.0\r\n");
    }

    showLine ()
    {

        let prefix = '';

        if(this.ioHandler) 
        {
            prefix = this.IOprompt;
        }
        else
        {
            prefix = this.app.promptStr;
        }

        this.term.write(CURSOR_HIDE);
        this.term.write(prefix);
        this.term.write(this.currLine.slice(0, this.lineIndex));
        this.term.write(CURSOR_SAVE);
        this.term.write(this.currLine.slice(this.lineIndex));
        this.term.write(CURSOR_RESTORE);
        this.term.write(CURSOR_SHOW);
    }

    clearLine () 
    {

        let prefix = '';

        if(this.ioHandler) 
        {
            prefix = this.IOprompt;
        }
        else
        {
            prefix = this.app.promptStr;
        }

        const lines = Math.floor(
            (this.currLine.length + prefix - 1) / this.term.getCols()
        );
        
        this.term.write(CURSOR_HIDE);
        
        this.term.write(DOWNKEY.repeat(
            Math.floor(Math.abs(
                (this.currLine.length + prefix - 1)/this.term.getCols())
            ) - 
            Math.floor(Math.abs(
                (this.lineIndex + prefix - 1) / this.term.getCols()
                )
            )
        ));
        
        this.term.write(CSI + this.term.getCols() + "D")
        this.term.write(ERASE_LINE);
        
        for(let x = 0; x < lines; x++)
        {
            this.term.write(UPKEY);
            this.term.write(ERASE_LINE);
        }
                 
        this.term.write(CURSOR_SHOW);
    }
 
    resetLine()
    {
        this.currLine = "";
        this.lineIndex = 0;
    }
}

// we need to asynchronously
// run the actual command so
// we can free the terminal
// up for I/O.

// don't 

function run (repl) 
{
    let appLine = repl.currLine;
    repl.resetLine();
    
    // we'd rather not call JSON.stringify()
    // on a piece of data more than once.

    let closeCmd = () => {
        repl.ioHandler = null;
        repl.IOprompt  = '';
        repl.currLine  = '';
        repl.term.write(CRLF);
        repl.io = false;
        repl.showLine();
    }

    setTimeout(() => { 
        repl.app.exec(appLine, repl.term, true)
        .then((out) => 
            {
                if(out != undefined) 
                {
                    if(typeof out == "string") {repl.term.write(out);}
                    else {repl.term.write(JSON.stringify(out));}
                }
        
                else {repl.term.write(String(undefined))};
                closeCmd();
            }
        )
        .catch((e) =>
        {
            if(e)
            { 
                term.write(sanitize(String(e)) + "\r\n");
                console.log(e);
            }

            closeCmd();
        })
     }, 
     0
    );
}