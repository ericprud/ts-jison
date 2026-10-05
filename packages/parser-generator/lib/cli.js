#!/usr/bin/env node

function getCommandlineOptions () {
    "use strict";
    var version = require('../package.json').version;
    var opts = require("nomnom")
        .script('jison')
        .option('name', {
            abbr : 'n',
            default: '',
            metavar : 'NAME',
            help : 'prefix for name of parser and lexer to emit, e.g. "FooParser" and "FooLexer"'
        })
        .option('file', {
            flag : true,
            position : 0,
            help : 'file containing a grammar'
        })
        .option('lexfile', {
            flag : true,
            position : 1,
            help : 'file containing a lexical grammar'
        })
        .option('json', {
            abbr : 'j',
            flag : true,
            help : 'force jison to expect a grammar in JSON format'
        })
        .option('outfile', {
            abbr : 'o',
            metavar : 'FILE',
            help : 'Filename and base module name of the generated parser'
        })
        .option('debug', {
            abbr : 'd',
            flag : true,
            default: false,
            help : 'Debug mode'
        })
        .option('warn-untyped-nterm', {
            default: false,
            flag: true,
            help: "Show warning when a non-terminal is not typed"
        })
        .option('show-nterm', {
            default: false,
            flag: true,
            help: "Show non-terminal name after case labels"
        })
        .option('module-type', {
            abbr : 'm',
            default: 'core',
            metavar : 'TYPE',
            help : 'The type of module to generate (commonjs, amd, js, core)'
        })
        .option('parser-type', {
            abbr : 'p',
            default: 'lalr',
            metavar : 'TYPE',
            help : 'The type of algorithm to use for the parser (lr0, slr,' +
                'lalr, lr)'
        })
        .option('template', {
            abbr : 't',
            default: 'javascript',
            metavar : 'TYPE',
            help : 'Built-in (javascript, typescript) or path to template' +
                'directory with "error" and "parser" files'
        })
        .option('version', {
            abbr : 'V',
            flag : true,
            help : 'print version and exit',
            callback : function () {
                return version;
            }
        }).parse();

    return opts;
}

var cli = module.exports;

cli.main = function cliMain(opts) {
    "use strict";
    opts = opts || {};

    function processGrammar(raw, lex, opts) {
        var grammar,
        parser;
        grammar = cli.processGrammars(raw, lex, opts.json);
        parser = cli.generateParserString(opts, grammar);
        return parser;
    }

    function processInputFile () {
        var fs = require('fs');
        var path = require('path');

        // getting raw files
        var lex;
        if (opts.lexfile) {
            lex = fs.readFileSync(path.normalize(opts.lexfile), 'utf8');
        }
        var raw = fs.readFileSync(path.normalize(opts.file), 'utf8');

        // making best guess at json mode
        opts.json = path.extname(opts.file) === '.json' || opts.json;

        // setting output file name and module name based on input file name
        // if they aren't specified.
        var name = path.basename((opts.outfile || opts.file));

        name = name.replace(/\..*$/g, '');

        opts.outfile = opts.outfile || (name + '.js');
        if (!opts.moduleName && name) {
            opts.moduleName = name.replace(/-\w/g,
                    function (match) {
                    return match.charAt(1).toUpperCase();
                });
        }

        var parser = processGrammar(raw, lex, opts);
        fs.writeFileSync(opts.outfile, parser);
    }

    function readin(cb) {
        var stdin = process.openStdin(),
        data = '';

        stdin.setEncoding('utf8');
        stdin.addListener('data', function (chunk) {
            data += chunk;
        });
        stdin.addListener('end', function () {
            cb(data);
        });
    }

    function processStdin () {
        readin(function (raw) {
            console.log(processGrammar(raw, null, opts));
        });
    }

    // if an input file wasn't given, assume input on stdin
    if (opts.file) {
        processInputFile();
    } else {
        processStdin();
    }
};

cli.generateParserString = function generateParserString(opts, grammar) {
    "use strict";
    opts = opts || {};
    var jison = require('./jison.js');

    var settings = grammar.options || {};

    if (opts['parser-type']) {
        settings.type = opts['parser-type'];
    }
    if (opts.moduleName) {
        settings.moduleName = opts.moduleName;
    }
    settings.debug = opts.debug;
    if (!settings.moduleType) {
        settings.moduleType = opts['module-type'];
    }
    if (opts.name) {
        settings.moduleName = opts.name;
    }
    if (opts.template) {
        settings.template = opts.template;
    }
    if (opts['show-nterm']) {
        settings.showNTerm = opts['show-nterm']
    }
    if (opts['warn-untyped-nterm']) {
        settings.warnUntypedNTerm = opts['warn-untyped-nterm']
    }

    var generator = new jison.Generator(grammar, Object.assign({makeGenerators: true}, settings));
    return generator.generate(settings);
};

cli.processGrammars = function processGrammars(file, lexFile, jsonMode) {
    "use strict";
    lexFile = lexFile || false;
    jsonMode = jsonMode || false;
    var ebnfParser = require('@ts-jison/ebnf-parser');
    var lexParser = require('@ts-jison/lex-parser');
    var cjson = require('cjson');
    var grammar;
    try {
        if (jsonMode) {
            grammar = cjson.parse(file);
        } else {
            grammar = ebnfParser.parse(file);
        }
    } catch (e) {
        throw new Error('Could not parse jison grammar:' + (e.stack || e));
    }
    try {
        if (lexFile) {
            grammar.lex = new lexParser.LexParser().parse(lexFile);
        }
    } catch (e) {
        throw new Error(`Could not parse lex grammar: ${e}`);
    }
    return grammar;
};


if (require.main === module) {
    var opts = getCommandlineOptions();
    cli.main(opts);
}
