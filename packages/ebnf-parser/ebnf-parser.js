var bnf = require("./lib/bnf-parser").BnfParser,
    ebnf = require("./ebnf-transform"),
    jisonlex = require("@ts-jison/lex-parser").LexParser;

const yy = {

  // parse an embedded lex section
  parseLex: function (text) {
    return new jisonlex().parse(text.replace(/(?:^%lex)|(?:\/lex$)/g, ''));
  },

  // adds a declaration to the grammar
  addDeclaration: function (grammar, decl) {
    if (decl.start) {
      grammar.start = decl.start;

    } else if (decl.lex) {
      grammar.lex = this.parseLex(decl.lex);

    } else if (decl.operator) {
      if (!grammar.operators) grammar.operators = [];
      grammar.operators.push(decl.operator);

    } else if (decl.parseParam) {
      if (!grammar.parseParams) grammar.parseParams = [];
      grammar.parseParams = grammar.parseParams.concat(decl.parseParam);

    } else if (decl.include) {
      if (!grammar.moduleInclude) grammar.moduleInclude = '';
      grammar.moduleInclude += decl.include;

    } else if (decl.options) {
      if (!grammar.options) grammar.options = {};
      for (var i=0; i < decl.options.length; i++) {
        grammar.options[decl.options[i]] = true;
      }
    } else if (decl.type) {
      if (!grammar.type) grammar.type = {};
      for (var nterm in decl.type) {
        if (nterm in grammar.type) {
          console.log(`Type of ${nterm} is overriden.`)
        }
        grammar.type[nterm] = decl.type[nterm];
      }

    } else
      /* debugger */
      /* unexpected */
      ;
  }
}

exports.parse = function parse (grammar) { return new bnf(yy).parse(grammar); };
exports.transform = ebnf.transform;

