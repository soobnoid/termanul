// cmdOpts look like this
/**
 * name: {
 *  longAliases:[..] // "invoked with --"
 *  shortAliases:[..] // "invoked with -"
 *  input: "none"/"string"/"bool"/"num"/"json"
 * }   
 */

// commands look like

/**
 * name: {
 *  opts: {..}/"none"/"infix"
 *  callback: function(cmd, app, terminal)
 * }
 * */

// basically a command gotta
// be a collection of opts 
// which specify what args
// it can take...
// and then it gotta have
// a function that actually
// does something with those args.

function createOpt(shortAliases, longAliases, inputType, desc)
{
    let result = {};

    result.shortAliases = shortAliases
    result.longAliases = longAliases
    result.input = inputType
    result.desc  = desc;
    return result;
}

let isShortOpt = (str) => (str[0] == '-');
let isLongOpt  = (str) => (str[0] == '-' && str[1] == '-');

async function lexCmd (inputString, index, app, term) 
{
    const result = [];
    let buffer = '';
    let inQuotes = false;
    let inDoubleQuotes = false;
    let inCurlyBraces = 0;
    let inParens = 0;
    let inBrackets = 0;

    let inComment = false;

    let inline = false;

    for (let i = 0; i < inputString.length; i++) 
    {
        const char = inputString[i];

        if(inComment)
        {
            if(char != "\n") {continue;}
            else
            {
                inComment = false;
                continue;
            }
        }

        if(inline)
        {

            let eval = false;
            let deref = false;

            if(char != "(" && char != "{") 
            {
                term.write("inline scope not declared\r\n");
                return null;
            }

            else
            {
                token = await lexCmd(inputString.slice(i), 1, app, term);
                token = token[0];

                let out = undefined;

                if(token[0] == '(') 
                {
                    eval = true;
                    out = await app.exec(
                            token.slice(1, -1),
                            term,
                            false
                    );
                }
                else if(token[0] == "{")
                {
                    deref = true;
                    let ref = await lexReference(token.slice(1,-1), term, app);
                    out = app.dereference(ref, term);
                }               
                
                if(out != undefined) 
                {
                    if(typeof out == "string") {buffer += out;}
                    else {buffer += JSON.stringify(out)}
                }

                else {buffer += String(undefined)};

                // parse to end of old token.

                let done = false;
                let dInSingleQuotes = false;
                let dInDoubleQuotes = false;

                let dInParens = 1;
                let dInBrackets = 1;

                for(let x = i + 1; x < inputString.length; x++)
                {
                    if(done) {break;}

                    const dChar = inputString[x];

                    if(inComment)
                    {
                        if(dChar != "\n") {continue;}
                        else
                        {
                            inComment = false;
                            continue;
                        }
                    }

                    switch(dChar)
                    {
                        case ')':
                            if(eval)
                            {
                                if(!dInSingleQuotes && !dInDoubleQuotes)
                                {
                                    dInParens --;
                                    if(dInParens == 0)
                                    {
                                        i = x;
                                        done = true;
                                    }
                                }
                            }
                            break;

                        case '(':
                            if(eval)
                            {
                                if(!dInSingleQuotes && !dInDoubleQuotes)
                                {
                                    dInParens ++;
                                }
                            }
                            break;

                        case '}':
                            if(deref)
                            {
                                if(!dInSingleQuotes && !dInDoubleQuotes)
                                {
                                    dInBrackets --;
                                    if(dInBrackets == 0)
                                    {
                                        i = x;
                                        done = true;
                                    }
                                }
                            }
                            break;
    
                        case '{':
                            if(deref)
                            {
                                if(!dInSingleQuotes && !dInDoubleQuotes)
                                {
                                    dInBrackets ++;
                                }
                            }
                            break;    
                        
                        case '"':
                            inDoubleQuotes = !inDoubleQuotes;
                            break;
                            
                        case "'":
                            inQuotes = !inQuotes;
                            break;
                        
                        case "#":
                            if(!dInDoubleQuotes && !dInDoubleQuotes)
                            {
                                inComment = true;
                            }
                            break;

                        default: break;
                    }
                }
                
                if(!done)
                {
                    term.write("dynamic parse error\r\n");
                    return null;
                }
            }

            inline = false;
            continue;
            
        }

        switch(char)
        {
            case '(':
                buffer += char;
                if(!inQuotes && !inDoubleQuotes) {inParens++;}
                break;

            case ')':
                if(!inQuotes && !inDoubleQuotes)
                {
                    if (inParens == 0)
                    {
                        if (buffer.trim().length) 
                        {
                            result.push(buffer.trim());
                        }
                        return result;
                    } 
                else {inParens--;}
                }
                buffer += char;
                break;

            case '[':
                buffer += char;
                if(!inQuotes && !inDoubleQuotes) {inBrackets++;}
                break;

            case ']':
                if(!inQuotes && !inDoubleQuotes)
                {
                    if (inBrackets == 0)
                    {
                        if (buffer.trim().length) 
                        {
                            result.push(buffer.trim());
                        }
                        return result;
                    } 
                else {inBrackets--;}
                }
                buffer += char;
                break;

            case '{':
                buffer += char;
                if(!inQuotes && !inDoubleQuotes) {inCurlyBraces++;}
                break;

            case '}':
                if(!inQuotes && !inDoubleQuotes)
                {
                    if (inCurlyBraces == 0)
                    {
                        if (buffer.trim().length) {result.push(buffer.trim());}
                        return result;
                    } 
                    else {inCurlyBraces--;}
                }
                buffer += char;
                break;
    
            case "&":
            case '$':
                if(!inQuotes && !inDoubleQuotes) 
                {
                    if(
                       (char == "&" && (inParens || inCurlyBraces)) || 
                       (char == "&" && !app) 
                      ) 
                    {
                        buffer += char;
                    }
                    
                    else
                    {
                        inline = true;
                    }
                }
                else {buffer += char;}
                break;

            case ';':
            case '\n':
            case '\t':
            case ' ':
                if(
                   !inQuotes && 
                   !inDoubleQuotes &&
                   !inParens && 
                   inCurlyBraces == 0 &&
                   inBrackets == 0
                  )
                {
                    if (buffer.trim().length) 
                    {
                        result.push(buffer.trim());
                        if(index)
                        {
                            if(result.length == index) {return result;} 
                        }
                    }

                    if(char == ';') 
                    {
                        result.push(char);
                        {
                            if(result.length == index) {return result;} 
                        }
                    }

                    buffer = '';
                }
                else {buffer += char;}
                break;

            case '"':
                inDoubleQuotes = !inDoubleQuotes;
                buffer += char;
                break;

            case "'":
                inQuotes = !inQuotes;
                buffer += char;
                break;

            case "#":
                if(!inDoubleQuotes && !inQuotes)
                {
                    inComment = true;
                    if (buffer.trim().length) 
                    {
                        result.push(buffer.trim());
                        if(index)
                        {
                            if(result.length == index)
                            {
                                return result;
                            } 
                        }
                    }
                    buffer = '';
                }
                else {buffer += char;}
                break;

            default:
                buffer += char;
                break;
        }
    }
  
    if (buffer.trim().length) {result.push(buffer.trim());}
    return result;
  }
  

// take string and spit out a command
// object.

function parseLine(
                   cmd,
                   term,
                   app
                  )
{   
    result = {};
    result.name = cmd[0];

    let template = null;

    if(result.name in app.cmds && app.cmds[result.name].opts != "infix") 
    {
        template = app.cmds[result.name];
        cmd = cmd.slice(1);
    }

    else
    {
        result.name = cmd[1];
        if(result.name in app.cmds && app.cmds[result.name].opts == "infix")
        {
            template = app.cmds[result.name];
            result.left = cmd[0]; 
            cmd = cmd.slice(2);
        }
    }

    if(template)
    {
        result.rest = [];

        let optArg = false;
        let argType = '';
        let argName = '';

        let isRest = false;

        if(template.opts == "none")
        {
            isRest = true;
        }


        for (tokenIndex in cmd)
        {
            if (isRest) 
            {
                result.rest.push(cmd[tokenIndex]);
            }

            else if(optArg)
            {
                let arg = cmd[tokenIndex];

                let parsedValue;
                
                try {val = JSON.parse(cmd[tokenIndex]);}
                catch (E) {val = cmd[tokenIndex];}

                switch (argType) 
                {
                    case "string":
                        if (typeof val == "string") {result[argName] = val;}
                        else 
                        {
                            term.write(argName + " value not string\r\n");
                            return null;
                        } 
                        break;
                    
                    case "bool":
                        if (typeof val == "boolean") {result[argName] = val;}
                        else 
                        {
                            term.write(argName + " value not boolean\r\n");
                            return null;
                        } 
                        break;

                    case "num":
                        if (typeof val == "number") {result[argName] = val;}
                        else 
                        {
                            term.write(argName + " value not number\r\n");
                            return null;
                        } 
                        break;
                    
                    case "json":
                    default:
                        result[argName] = val;
                        break;
                }

                optArg = false;
                argType     = '';
                argName     = ''
            }
            
            else if(isLongOpt(cmd[tokenIndex])) 
            {
                let token = cmd[tokenIndex].slice(2);
                for(opt in template.opts)
                {
                    if(template.opts[opt].longAliases.includes(token))
                    {
                        optArg  = true;
                        argName = opt;
                        argType = template.opts[opt].input;
                    }
                }

                if (!optArg) 
                {
                    term.write("long opt '" + token + "' not recognized\r\n");
                    return null;
                }
            }

            else if(isShortOpt(cmd[tokenIndex]))
            {
                let token = cmd[tokenIndex].slice(1);
                for(opt in template.opts)
                {
                    if(template.opts[opt].shortAliases.includes(token))
                    {
                        optArg  = true;
                        argName = opt;
                        argType = template.opts[opt].input;
                    }
                }
                if (!optArg) 
                {
                    term.write("short opt '" + token + "' not recognized\r\n");
                    return null;
                }
            }

            else 
            {
                isRest = true;
                result.rest.push(cmd[tokenIndex]);
            }

            if (argType == "none") 
            {
                result[argName] = true;

                optArg  = false;
                argType = '';
                argName = ''
            }
        }
    }

    else 
    {
        term.write("cmd '" + result.name + "' not found\r\n");
        return null;
    }
    return result;
}

async function parseCmd(
                  cmdStr,
                  term,
                  app
                 )
{
    let result = [];

    let cmd = await lexCmd(cmdStr, null, app, term);
    if(!cmd) {return null;}

    let lines = [];
    let currentLine = [];

    for (let item of cmd)
    {
        if (item == ";") 
        {
            if(currentLine.length > 0) 
            {
                lines.push(currentLine);
            }
            
            currentLine = [];
        } 
        else {currentLine.push(item);}
    }

    if(currentLine.length > 0) 
    {
        lines.push(currentLine);
    }

    for(const line of lines)
    {
        let cmd = parseLine(line, term, app);
        if(cmd == null) {return null;}
        result.push(cmd);
    }
    
    return result;
}

// cmdOpts look like this
/**
 * name: {
 *  longAliases:[..] // "invoked with --"
 *  shortAliases:[..] // "invoked with -"
 *  input: "none"/"string"/"bool"/"num"/"json"
 * }   
 */

// these two are to assist 

// please note that it's still on
// you to ensure that there is
// no namespace collision
// between short and long option aliases.

let argTypes = ["none", "string", "bool", "num", "json", "infix"];

// since js supports object-nested lambda
// declarations we don't really need a constructor
// for this.

// parse lexed token and 
// convert to reference object.

// we don't need to worry about spaces
// and dumb shit since we are already
// working with a token.

async function lexReference (token, term, app, noAssign)
{
    let result = {};

    result.len = 0;
    result.refStack = [];
    result.assignment = null;

    let inQuotes = false;
    let inDoubleQuotes = false;

    let buffer = '';

    let assignment = false;

    let trailSpace = 1;

    for(charIndex in token)
    {
        result.len++;
        const char = token[charIndex];

        if(assignment)
        {
            if(noAssign) 
            {
                term.write("illegal assignment\r\n");
                return null;
            }

            if(char == " " || char == "\t" || char == "\n") 
            {
                trailSpace ++;
                continue;
            }

            else if(char == "=")
            {
                charIndex++;
                result.assignment = await lexCmd(token.slice(charIndex), 1, app, term);
                result.assignment = result.assignment[0];

                if(result.assignment)
                {
                    result.len += result.assignment.length + 1;
                }
                else
                {
                    term.write("'=' with no assignment\r\n");
                }
                return result;
            }
            else 
            {
                result.len -= trailSpace + 1;
            }

            break;
        }

        switch(char)
        {
            case '"':
                inDoubleQuotes = !inDoubleQuotes;
                break;

            case "'":
                inQuotes = !inQuotes;
                break;
            
            case ";":
            case ")":
            case "]":
            case "}":
                if(!inQuotes && !inDoubleQuotes) 
                {
                    result.refStack.push(buffer);
                    if(char == ";") {result.len--;}
                    return result;
                }

            case "=":
                if(!inQuotes && !inDoubleQuotes)
                {
                    if(noAssign) 
                    {
                        term.write("illegal assignment\r\n");
                        return null;
                    }

                    result.refStack.push(buffer);
                    charIndex++; result.len ++;
                    result.assignment = await lexCmd(token.slice(charIndex), 1, app, term)[0];
                    if(result.assignment)
                    {
                        result.len += result.assignment.length + 1;
                    }
                    else
                    {
                        term.write("'=' with no assignment\r\n");
                    }
                    return result;
                }
                else {buffer += char;}
                break;

            case " ":
            case "\n":
            case "\t": 
                if(!inQuotes && !inDoubleQuotes) 
                {
                    assignment = true;
                    result.refStack.push(buffer);
                }
                else {buffer += char;}
                break;

            case ".":
                if(!inQuotes && !inDoubleQuotes)
                {
                    result.refStack.push(buffer);
                    buffer = '';
                }
                else {buffer += char;}
                break;

            default:
                buffer += char;
                break;
        }
    }

    result.refStack.push(buffer);
    return result;
}

function cmpRef(refStack1, refStack2) 
{
    if (refStack1.length != refStack2.length) 
    {
      return false;
    }
  
    for (let i = 0; i < refStack1.length; i++) 
    {
      if (refStack1[i] != refStack2[i])
      {
        return false;
      }
    }
  
    return true;
  }

class terminalApplication
{
    constructor(
                /*"shug@box"*/ promptStr,
                /*command list*/ cmds,
                /*default variables*/ env,
               )
    {
        this.promptStr = promptStr; 

        this.env = env;
        this.cmds = cmds; 

        this.savedLine = '';

        this.historyIndex = -1;
        
        this.history = [];
        this.logs = [];
        this.callstack = [];
    }

    dereference(reference, term) 
    {
        let ref = JSON.parse(JSON.stringify(reference));
        let scope = this.env;

        // resolve scope
        if(ref.refStack.length > 1)
        {
            for(let scopeIndex in ref.refStack.slice(0,-1))
            {
                scope = scope[ref.refStack[scopeIndex]];
                if(scope == null) 
                {
                    for(let i = 0; i <= scopeIndex; i++)
                    {
                        term.write(sanitize(ref.refStack[scopeIndex]) + ".");
                    }
                    term.write(" not defined\r\n");
                    return null;
                }
            }
        }

        let varName = ref.refStack.pop();

        if(ref.assignment != null)
        {
            try {scope[varName] = JSON.parse(ref.assignment);}
            catch
            {
                term.write("invalid assignment\r\n");
                return null;
            }
        }

        return scope[varName];
    }

    async exec (cmd, term, fromRepl)
    {
        term.repl.io = true;
        if(fromRepl) {term.write(CRLF);}
    
        this.savedLine = '';

        if(cmd.trim().length != 0) 
        {
            if(fromRepl) 
            {
                if(cmd != this.history[0])
                {
                    this.history = [cmd].concat(this.history);
                    this.historyIndex = -1;
                }
            }

            this.logs = [cmd].concat(this.logs);

            try 
            {
                let cmds = await parseCmd(cmd, term, this);
                if(cmds)
                {
                    let lastCmd = cmds.splice(-1, 1)[0];

                    for (cmd of cmds) 
                    {
                        this.cmds[cmd.name].callback(cmd, this, term);
                    }

                    let ret = this.cmds[lastCmd.name].callback(lastCmd, this, term);
                    term.repl.io = false;
                    return ret;
                }
                else
                {
                    term.write("parse error\r\n");
                    term.repl.io = false;
                    return null;
                }
            }
            catch (e)
            {
                console.log(e);
                term.write(sanitize(String(e)));
                term.write("error running command\r\n");
                term.repl.io = false;
                return null;
            }
        }
        else {return null;}
    } 
}

let unwrapToken = (token) => {return token.slice(1,-1);}

let baseShell = {
    test: {
        opts:{
            help:createOpt(
                ["h","H"],
                ["help"],
                "none",
                "help description"
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
    },
    
    while: {
        opts: "none",
        callback: async (cmd, app, term) => {
            let ref   = await lexReference(unwrapToken(cmd.rest[0]));
            let clause = await lexCmd(unwrapToken(cmd.rest[1]));
        },
        desc : "TODO\r\n"
    },

    if: {
        opts: "none",
        callback: async (cmd, app, term) => {
            let ref    = await lexReference(unwrapToken(cmd.rest[0]), term, app, false);
            let clause = await lexCmd(unwrapToken(cmd.rest[1]));
        },
        desc : "TODO\r\n"
    },
    
    in: {
        opts: "infix",
        callback: async (cmd, app, term) => {
            term.write("left: " + cmd.left + "\r\n");
            term.write("right: " + cmd.rest + "\r\n");
            return null;
        },
        desc: "demonstrate that infix commands work\r\n"
    },

    for: {
        opts: "none",
        callback: async (cmd, app, term) => {
            
            let ref = await lexReference(unwrapToken(cmd.rest[0]), term);
            let set = await app.exec(unwrapToken(ref.assignment), term);
            
            clause = unwrapToken(cmd.rest[1]);

            for(index in set)
            { 
                ref.assignment = set[index];
                app.dereference(ref, term);
                await app.exec(clause, term);
            }

            return 0;
        },
        desc : "for (item = {set from cmd}) {echo &{item}}\r\n"
    },

    read: {
        opts: {
            in:createOpt(
                ["i"],
                ["in"],
                "string",
                "string to display as prompt on line"
            )
        },
        callback: async (cmd, app, term) => {
            let inStr = '';
            if(cmd.in) 
            {
                inStr = cmd.in;
            }
            
            let line = term.readLine(inStr);
            return await line;
        },
        desc : "reads current line as input\r\n"
    },

    map: {
        opts: "none",
        callback: async (cmd, app, term) => {
            
            let ref = await lexReference(unwrapToken(cmd.rest[0]));
            let set = await app.exec(unwrapToken(ref.assignment), term);
            
            clause = unwrapToken(cmd.rest[1]);

            for(index in set)
            { 
                ref.assignment = set[index];
                app.dereference(ref, term);
                set[index] = await app.exec(clause, term);
            }

            return set;
        },
        desc : "map (item = {set from cmd}) {cmd &{item}} returns set upon mapping of each item\r\n"
    },

    echo: {
        opts: "none",
        callback: async (cmd, app, term) => {
            return cmd.rest;
        },
        desc : "returns list of tokens passed"
    },

    write: {
        opts: "none",
        callback: async (cmd, app, term) => {
            for(token in cmd.rest)
            {
                term.write(cmd.rest[token] + "\r\n");
            }
            return null;
        },
        desc : "write command line args to terminal\r\n"
    },

    help: {
        opts: "none",
        callback: async (cmd, app, term) => {
            docs(app.cmds, cmd.rest[0], term);
            return null;
        },
        desc : "print help for commands"
    },

    env: {
        opts: "none",
        callback: async (cmd, app, term) => {
            term.write(JSON.stringify(app.env));
        }
    }
};

let baseEnv = {
    interactive : true,
    terminal : "xtermJs",
    host : window.location,
    window : window,
    document : document 
};

let baseInterpreter = new terminalApplication(
    /*promptStr*/ "termanul >>> ",
    /*base commands*/ baseShell,
    /*base enviromental variables*/ baseEnv
);

function docs (cmds, commandName, term) 
{

    if(commandName) 
    {
        if(commandName in cmds) 
        {
            let cmd = cmds[commandName];
            cmds = {};
            cmds[commandName] = cmd;
        }
        else
        {
            cmds = null;
        }
    }

    if (cmds) 
    {
        // If a command name is not specified, 
        // print documentation for all commands.
        
        for (const cmdName in cmds) 
        {
            const cmd = cmds[cmdName];
            term.write(`Command: ${cmdName}\r\n`);
            
            term.write(`  desc: ${cmd.desc}`);

            if (cmd.opts == "infix")
            {
                term.write("  infix\r\n");
            }

            else if (cmd.opts == "none") {}

            else  
            {
                for (const optionName in cmd.opts) 
                {
                    const option = cmd.opts[optionName];
                    
                    let optdesc = option.desc;
                    if(!optdesc) {optdesc = '';}
                    
                    term.write(`  ${optionName} (${optdesc}):\r\n`);

                    if(option.shortAliases) 
                    {
                        term.write(`    {-${option.shortAliases.join(', -')}}\r\n`);
                    }
                
                    if(option.longAliases) 
                    {
                        term.write(`    {--${option.longAliases.join(', --')}}\r\n`);
                    }
                
                    if(option.input) 
                    {
                        term.write(`    type = ${option.input}\r\n`);
                    }
              }
            }
        
            term.write("\r\n");
        }
    } 
    
    else 
    {
        term.write(`Command '${commandName}' not found.\r\n`);
    }
}
  