// Basic Lexer implemented using JavaScript regular expressions
// MIT Licensed

"use strict";

const Fs = require('fs');
const Path = require('path');
const lexParser = require('@ts-jison/lex-parser').lexParser;
const {FileTemplate} = require('@ts-jison/common-generator');
const version = require('../package.json').version;

// expand macros and convert matchers to RegExp's
function prepareRules(rules, macros, actions, tokens, startConditions, caseless) {
    var m,i,k,action,conditions,
        newRules = [];

    if (macros) {
        macros = prepareMacros(macros);
    } else {
        macros = {}
    }

    const noBreakIf = new RegExp(macros['no-break-if'] === undefined
                                 ? '$.' // nothing can follow '$'
                                 : macros['no-break-if'] === ''
                                 ? '.*'
                                 : '^(?:' + macros['no-break-if'] + ')$');

    function tokenNumberReplacement (str, token) {
        return "return " + (tokens[token] || "'" + token + "'");
    }

    for (i=0;i < rules.length; i++) {
        if (Object.prototype.toString.apply(rules[i][0]) !== '[object Array]') {
            // implicit add to all inclusive start conditions
            for (k in startConditions) {
                if (startConditions[k].inclusive) {
                    startConditions[k].rules.push(i);
                }
            }
        } else if (rules[i][0][0] === '*') {
            // Add to ALL start conditions
            for (k in startConditions) {
                startConditions[k].rules.push(i);
            }
            rules[i].shift();
        } else {
            // Add to explicit start conditions
            conditions = rules[i].shift();
            for (k=0;k<conditions.length;k++) {
                startConditions[conditions[k]].rules.push(i);
            }
        }

        m = rules[i][0];
        if (typeof m === 'string') {
            for (k in macros) {
                if (macros.hasOwnProperty(k)) {
                    m = m.split("{" + k + "}").join('(' + macros[k] + ')');
                }
            }
            m = new RegExp("^(?:" + m + ")", caseless ? 'i':'');
        }
        newRules.push(m);
        if (typeof rules[i][1] === 'function') {
            rules[i][1] = String(rules[i][1]).replace(/^\s*function\s*\(\s*\)\s*{/, '').replace(/}\s*$/, '');
        }
        action = rules[i][1];
        if (tokens && action.match(/return '[^']+'/)) {
            action = action.replace(/return '([^']+)'/g, tokenNumberReplacement);
        }

        if (noBreakIf.test(action)) {
            if ('verbose' in macros) {
                console.log('not adding break because ', noBreakIf, 'matches', action);
            }
        } else {
            if ('verbose' in macros) {
                console.log('adding break because ', noBreakIf, 'does not match', action);
            }
            action = action + '\n      break;';
        }
        actions.push('    case ' + i + ':' + action);
    }

    return newRules;
}

// expand macros within macros
function prepareMacros (macros) {
    var cont = true,
        m,i,k,mnew;
    while (cont) {
        cont = false;
        for (i in macros) if (macros.hasOwnProperty(i)) {
            m = macros[i];
            for (k in macros) if (macros.hasOwnProperty(k) && i !== k) {
                mnew = m.split("{" + k + "}").join('(' + macros[k] + ')');
                if (mnew !== m) {
                    cont = true;
                    macros[i] = mnew;
                }
            }
        }
    }
    return macros;
}

function prepareStartConditions (conditions) {
    var sc,
        hash = {};
    for (sc in conditions) if (conditions.hasOwnProperty(sc)) {
        hash[sc] = {rules:[],inclusive:!!!conditions[sc]};
    }
    return hash;
}

function buildActions (dict, tokens) {
    var actions = [];
    var tok;
    var toks = {};

    for (tok in tokens) {
        toks[tokens[tok]] = tok;
    }

    if (dict.options && dict.options.flex) {
        dict.rules.push([".", "console.log(yytext);"]);
    }

    this.rules = prepareRules(dict.rules, dict.macros, actions, tokens && toks, this.conditions, this.options && this.options["case-insensitive"]);
    var fun = actions.join("\n");
    "yytext yyleng yylineno yylloc".split(' ').forEach(function (yy) {
        fun = fun.replace(new RegExp("\\b(" + yy + ")\\b", "g"), "yy_.$1");
    });

    return fun;
}

function RegExpLexer (dict, input, tokens, config = {}) {
    var opts = processGrammar(dict, tokens);
    var lexerText = generateModuleBody(opts, config.template);

    if (config.makeGenerators) return {
        generate: function () { return generateFromOpts(lexerText, opts); },
        generateModule: function () { return generateModule(lexerText, opts) + "return Lexer;\n"; },
        generateModuleCore: function () { return generateModuleCore(lexerText, opts, ['Import', 'Constructor', 'Export']); },
        generateCommonJSModule: function () { return generateCommonJSModule(lexerText, opts); },
        generateAMDModule: function () { return generateAMDModule(lexerText, opts); },
    };

    const code = "const [JisonLexer] = arguments;\n\n"
        + generateFromOpts(lexerText, Object.assign({bare: true}, opts)) + `return ${opts.moduleName || ""}Lexer;\n`;
    const { JisonLexer } = require('@ts-jison/lexer');
    const ctor = new Function(code)(JisonLexer);
    const lexer = new ctor();

    if (input) {
        lexer.setInput(input);
    }
    return lexer;
}

// generate lexer source from a grammar
function generate (dict, tokens) {
    var opt = processGrammar(dict, tokens);
    var lexerText = generateModuleBody(opt, null);

    return generateFromOpts(lexerText, opt) + "return Lexer;\n";
}

// process the grammar and build final data structures and functions
function processGrammar(dict, tokens) {
    var opts = {};
    if (typeof dict === 'string') {
        dict = new lexParser().parse(dict);
    }
    dict = dict || {};

    opts.options = dict.options || {};
    opts.moduleType = opts.options.moduleType;
    opts.moduleName = opts.options.moduleName;

    opts.conditions = prepareStartConditions(dict.startConditions);
    opts.conditions.INITIAL = {rules:[],inclusive:true};

    opts.actionInclude = dict.actionInclude;
    opts.performAction = buildActions.call(opts, dict, tokens);
    opts.conditionStack = ['INITIAL'];

    opts.moduleInclude = (dict.moduleInclude || '').trim();
    return opts;
}

// Assemble the final source from the processed grammar
function generateFromOpts (lexer, opt) {
    var code = "";

    if (opt.moduleType === 'commonjs') {
        code = generateCommonJSModule(lexer, opt);
    } else if (opt.moduleType === 'amd') {
        code = generateAMDModule(lexer, opt);
    } else {
        code = generateModule(lexer, opt);
    }

    return code;
}

function generateModuleBody (opt, templateParm) {
    const unitTemplatePath = Path.join(__dirname, '..', 'templates', (templateParm || 'javascript')) + '.yaml';
    const unitTemplate = new FileTemplate(unitTemplatePath, unitTemplatePath.endsWith(".json") ? FileTemplate.Format.JSON : FileTemplate.Format.YAML);

    var strs = {EOF: "1", options:JSON.stringify(opt.options)};
    const lexer = {strs, unitTemplate};
    if (opt.options) {
        lexer.options = JSON.stringify(opt.options);
    }

    lexer.strs.performAction = String(opt.performAction);
    lexer.strs.rules = "[" + opt.rules.join(",\n          ") + "\n        ]";
    lexer.strs.conditions = JSON.stringify(opt.conditions);
    return lexer;
}

function generateModuleFunction(lexer, opt) {
    return generateModuleCore(lexer, opt, ['Constructor']);
}
function generateModuleCore(lexer, opt, components) {
    opt = opt || {};
    var out = "/* generated by @ts-jison/lexer-generator " + version + " */\n";

    var templateParms = [
        { token: "NAME", value: opt.moduleName || ""},
        { token: "OPTIONS", value: JSON.stringify(opt.options) || "{}"},
        { token: "RULES", value: lexer.strs.rules },
        { token: "CONDITIONS", value: lexer.strs.conditions },
        { token: "ACTION_INCLUDE", value: opt.actionInclude || '' },
        { token: "STATE_ACTIONS", value: String(lexer.strs.performAction) },
    ];
    const moduleCode = components.map(k => lexer.unitTemplate.substitute(k, templateParms)).join('\n');
    out += moduleCode;

    if (opt.moduleInclude) {
        out += ";\n" + opt.moduleInclude;
    }

    return out + "\n";

    function repl (s, token, value) {
        var replaceMe = "{{" + token + "}}";
        var start = s.indexOf(replaceMe);
        if (start === -1)
            throw Error("\"{{" + token + "}}\" not found in template string:\n" + s);
        return s.substr(0, start) + value + s.substr(start+replaceMe.length);
    }
}

function generateModule(lexer, opt) {
    return generateModuleFunction(lexer, opt);
}

function generateAMDModule(lexer, opt) {
    var moduleName = opt.moduleName || "lexer";
    var out = "/* generated by @ts-jison/lexer-generator " + version + " */";

    out += "define([], "
        + generateModuleFunction(lexer, Object.assign({bare: true}, opt))
        + ");";

    return out;
}

function generateCommonJSModule(lexer, opt) {
    opt = opt || {};

    var out = "";
    var moduleName = opt.moduleName || "Lexer";

    out += generateModule(lexer, opt);
    out += "\nmodule.exports = " + moduleName + ";\n";
    return out;
}

RegExpLexer.generate = generate;

module.exports = RegExpLexer;

