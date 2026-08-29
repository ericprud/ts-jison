const Jison = require("../tests/setup").Jison,
    Lexer = require("../tests/setup").Lexer;
Shared = require("../tests/extend-expect");
Jison.print = Shared.print;
afterEach(Shared.nothingPrinted);

// handy recipe for spewing conflicts to Jison.print
// const junk = new Jison.Generator({tokens: [ 'x' ], startSymbol: "A", bnf: {"A" :[ 'x A', '']}}, {type: "lr0", noDefaultResolve: true});

const lexData = {
    rules: [
      {pattern: "x", action: "return 'x';"},
      {pattern: "y", action: "return 'y';"}
    ]
};

describe("api", () => {
  it("test tokens as a string",  () => {

    const grammar = {
      tokens: "x y",
      startSymbol: "A",
      bnf: {
        "A" :[ 'A x',
               'A y',
               ''      ]
      }
    };

    const parser = new Jison.Parser(grammar);
    parser.lexer = new Lexer(lexData);
    expect(parser.parse('xyx')).toParse("parse xyx");
  });

  it("test generator",  () => {

    const grammar = {
      bnf: {
        "A" :[ 'A x',
               'A y',
               ''      ]
      }
    };

    const parser = new Jison.Parser(grammar);
    parser.lexer = new Lexer(lexData);
    expect(parser.parse('xyx')).toParse("parse xyx");
  });

  it("test extra spaces in productions",  () => {

    const grammar = {
      tokens: "x y",
      startSymbol: "A",
      bnf: {
        "A" :[ 'A x ',
               'A y',
               ''      ]
      }
    };

    const parser = new Jison.Parser(grammar);
    parser.lexer = new Lexer(lexData);
    expect(parser.parse('xyx')).toParse("parse xyx");
  });

  it("test | seperated rules",  () => {

    const grammar = {
      tokens: "x y",
      startSymbol: "A",
      bnf: {
        "A" :"A x | A y | "
      }
    };

    const parser = new Jison.Parser(grammar);
    parser.lexer = new Lexer(lexData);
    expect(parser.parse('xyx')).toParse("parse xyx");
  });

  it("test start symbol optional",  () => {

    const grammar = {
      tokens: "x y",
      bnf: {
        "A" :"A x | A y | "
      }
    };

    const parser = new Jison.Parser(grammar);
    parser.lexer = new Lexer(lexData);
    expect(() => {
      parser.parse('');
    }).not.toThrow();
  });

  it("test start symbol should be nonterminal",  () => {

    const grammar = {
      tokens: "x y",
      startSymbol: "x",
      bnf: {
        "A" :"A x | A y | "
      }
    };

    expect(() => {
      new Jison.Generator(grammar);
    }).toThrow();
  });

  it("test token list as string",  () => {

    const grammar = {
      tokens: "x y",
      startSymbol: "A",
      bnf: {
        "A" :"A x | A y | "
      }
    };

    const gen = new Jison.Generator(grammar);
    expect(gen.terminals.indexOf('x') >= 0).toBe(true);
  });

  it("test grammar options",  () => {

    const grammar = {
      options: {type: "slr"},
      tokens: "x y",
      startSymbol: "A",
      bnf: {
        "A" :[ 'A x',
               'A y',
               ''      ]
      }
    };

    const gen = new Jison.Generator(grammar);
    expect(gen.EOF).toBe("$end");
  });

  it("test overwrite grammar options",  () => {

    const grammar = {
      options: {type: "slr"},
      tokens: "x y",
      startSymbol: "A",
      bnf: {
        "A" :[ 'A x',
               'A y',
               ''      ]
      }
    };

    const gen = new Jison.Generator(grammar, {type: "lr0"});
    expect(gen.constructor).toEqual(Jison.LR0Generator);
  });

  it("test yy shared scope",  () => {
    const lexData = {
      rules: [
        {pattern: "x", action: "return 'x';"},
        {pattern: "y", action: "return yy.xed ? 'yfoo' : 'ybar';"}
      ]
    };
    const grammar = {
      tokens: "x yfoo ybar",
      startSymbol: "A",
      bnf: {
        "A" :[[ 'A x', "yy.xed = true;" ],
              [ 'A yfoo', " return 'foo';" ],
              [ 'A ybar', " return 'bar';" ],
              ''      ]
      }
    };

    const parser = new Jison.Parser(grammar, {type: "lr0"});
    parser.lexer = new Lexer(lexData);
    expect(parser.parse('y')).toBe("bar");
    expect(parser.parse('xxy')).toBe("foo");
  });

  it("test optional token declaration",  () => {

    const grammar = {
      options: {type: "slr"},
      bnf: {
        "A" :[ 'A x',
               'A y',
               ''      ]
      }
    };

    const gen = new Jison.Generator(grammar, {type: "lr0"});
    expect(gen.constructor).toBe(Jison.LR0Generator);
  });

  it("test custom parse error method",  () => {
    const lexData = {
      rules: [
        {pattern: "a", action: "return 'a';"},
        {pattern: "b", action: "return 'b';"},
        {pattern: "c", action: "return 'c';"},
        {pattern: "d", action: "return 'd';"},
        {pattern: "g", action: "return 'g';"}
      ]
    };
    const grammar = {
      "tokens": "a b c d g",
      "startSymbol": "S",
      "bnf": {
        "S" :[ "a g d",
               "a A c",
               "b A d",
               "b g c" ],
        "A" :[ "B" ],
        "B" :[ "g" ]
      }
    };

    const parser = new Jison.Parser(grammar, {type: "lalr"});
    parser.lexer = new Lexer(lexData);
    let result = {};
    parser.yy.parseError = function (str, hash) {
      result = hash;
      throw str;
    };

    expect(() => {parser.parse("aga");}).toThrow();
    expect(result.text).toBe("a");
    expect(typeof result.token).toBe('string');
    expect(result.line).toBe(0);
  });

  it("test jison grammar as string",  () => {

    const grammar = "%% A : A x | A y | ;"

    const parser = new Jison.Generator(grammar).createParser();
    parser.lexer = new Lexer(lexData);
    expect(parser.parse('xyx')).toParse("parse xyx");
  });

  it("test no default resolve",  () => {
    const grammar = {
      tokens: [ 'x' ],
      startSymbol: "A",
      bnf: {
        "A" :[ 'x A',
               ''      ]
      }
    };

    const gen = new Jison.Generator(grammar, {type: "lr0", noDefaultResolve: true});
    expect().printed([
      "Conflict in grammar: multiple actions possible when lookahead token is x in state 0\n- reduce by rule: A -> \n- shift token (then go to state 2)", // state 0
      "Conflict in grammar: multiple actions possible when lookahead token is x in state 2\n- reduce by rule: A -> \n- shift token (then go to state 2)", // state 2
      "\nStates with conflicts:",
      "State 0",
      "  $accept -> .A $end #lookaheads= $end\n  A -> .x A\n  A -> .",
      "State 2",
      "  A -> x .A\n  A -> .x A\n  A -> ."
    ]);

    const parser = gen.createParser();
    parser.lexer = new Lexer(lexData);

    expect(gen.table.length == 4).toBe(true);
    expect(gen.conflicts == 2).toBe(true);
    expect(() => { parser.parse("xx"); }).toThrow(); // throws parse error for multiple actions
  });

  it("test EOF in 'Unexpected token' error message",  () => {

    const grammar = {
      bnf: {
        "A" :[ 'x x y' ]
      }
    };

    const parser = new Jison.Parser(grammar);
    parser.lexer = new Lexer(lexData);
    parser.lexer.showPosition = null; // needed for "Unexpected" message
    parser.yy.parseError = function (str, hash) {
      expect(str.match("end of input")).toBe(true);
    };

    expect(() => { parser.parse("xx"); }).toThrow();

  });

  it("test locations",  () => {
    const grammar = {
      tokens: [ 'x', 'y' ],
      startSymbol: "A",
      bnf: {
        "A" :[ 'x A',
               ['y', 'return @1'],
               ''      ]
      }
    };

    const lexData = {
      rules: [
        {pattern: "\\s", action: "/*ignore*/"},
        {pattern: "x", action: "return 'x';"},
        {pattern: "y", action: "return 'y';"}
      ]
    };
    const gen = new Jison.Generator(grammar);
    const parser = gen.createParser();
    parser.lexer = new Lexer(lexData);
    const loc = parser.parse('xx\nxy');

    expect(loc.first_line).toBe(2);
    expect(loc.last_line).toBe(2);
    expect(loc.first_column).toBe(1);
    expect(loc.last_column).toBe(2);
  });

  it("test default location action",  () => {
    const grammar = {
      tokens: [ 'x', 'y' ],
      startSymbol: "A",
      bnf: {
        "A" :[ 'x A',
               ['y', 'return @$'],
               ''      ]
      }
    };

    const lexData = {
      rules: [
        {pattern: "\\s", action: "/*ignore*/"},
        {pattern: "x", action: "return 'x';"},
        {pattern: "y", action: "return 'y';"}
      ]
    };
    const gen = new Jison.Generator(grammar);
    const parser = gen.createParser();
    parser.lexer = new Lexer(lexData);
    const loc = parser.parse('xx\nxy');

    expect(loc.first_line).toBe(2);
    expect(loc.last_line).toBe(2);
    expect(loc.first_column).toBe(1);
    expect(loc.last_column).toBe(2);
  });

  it("test empty productions contribute no location",  () => {
    // `Opt x`: the empty Opt must not pull @$ back to the token before it;
    // `x Opt`: nor push it forward.  An empty production reduces to a
    // zero-width location just before the lookahead.
    const grammar = {
      tokens: [ 'x', 'y' ],
      startSymbol: "S",
      bnf: {
        "S" :[ ['y A', 'return @A'] ],
        "A" :[ ['Opt x Opt', 'return @$'] ],
        "Opt" :[ '' ]
      }
    };
    const lexData = {
      rules: [
        {pattern: "\\s", action: "/*ignore*/"},
        {pattern: "x", action: "return 'x';"},
        {pattern: "y", action: "return 'y';"}
      ]
    };
    const gen = new Jison.Generator(grammar);
    const parser = gen.createParser();
    parser.lexer = new Lexer(lexData);
    const loc = parser.parse('y   x   ');

    expect(loc.first_line).toBe(1);
    expect(loc.first_column).toBe(4);   // x, not y
    expect(loc.last_line).toBe(1);
    expect(loc.last_column).toBe(5);    // ...and no further
    expect(loc.empty).toBeUndefined();
  });

  it("test locations by term name in action",  () => {
    const grammar = {
      tokens: [ 'x', 'y' ],
      startSymbol: "A",
      bnf: {
        "A" :[ 'x A',
               ['B', 'return @B'],
               ''      ],
        "B" :[ 'y' ]
      }
    };

    const lexData = {
      rules: [
        {pattern: "\\s", action: "/*ignore*/"},
        {pattern: "x", action: "return 'x';"},
        {pattern: "y", action: "return 'y';"}
      ]
    };
    const gen = new Jison.Generator(grammar);
    const parser = gen.createParser();
    parser.lexer = new Lexer(lexData);
    const loc = parser.parse('xx\nxy');

    expect(loc.first_line).toBe(2);
    expect(loc.last_line).toBe(2);
    expect(loc.first_column).toBe(1);
    expect(loc.last_column).toBe(2);
  });

  it("test lexer with no location support",  () => {
    const grammar = {
      tokens: [ 'x', 'y' ],
      startSymbol: "A",
      bnf: {
        "A" :[ 'x A',
               ['B', 'return @B'],
               ''      ],
        "B" :[ 'y' ]
      }
    };

    const gen = new Jison.Generator(grammar);
    const parser = gen.createParser();
    parser.lexer = {
      toks: ['x','x','x','y'],
      lex: function () {
        return this.toks.shift();
      },
      setInput: function (){}
    };
    const loc = parser.parse('xx\nxy');
    expect(loc).toEqual({
      "first_column": undefined,
      "first_line": undefined,
      "last_column": undefined,
      "last_line": undefined,
    });
  });

  it("test instance creation",  () => {
    const grammar = {
      tokens: [ 'x', 'y' ],
      startSymbol: "A",
      bnf: {
        "A" :[ 'x A',
               ['B', 'return @B'],
               ''      ],
        "B" :[ 'y' ]
      }
    };

    const gen = new Jison.Generator(grammar);
    const parser = gen.createParser();
    parser.lexer = {
      toks: ['x','x','x','y'],
      lex: function () {
        return this.toks.shift();
      },
      setInput: function (){}
    };
    const parser2 = gen.createParser();
    parser2.lexer = parser.lexer;
    parser2.parse('xx\nxy');

    parser.blah = true;

    expect(parser2.blah).toBe(undefined);
  });

  it("test reentrant parsing",  () => {
    const grammar = {
      bnf: {
        "S" :['A EOF'],
        "A" :['x A',
              'B',
              'C'
             ],
        "B" :[['y', 'return "foo";']],
        "C" :[['w', 'return yy.parser.parse("xxxy") + "bar";']]
      }
    };

    const lexData = {
      rules: [
        {pattern: "\\s", action: "/*ignore*/"},
        {pattern: "w", action: "return 'w';"},
        {pattern: "x", action: "return 'x';"},
        {pattern: "y", action: "return 'y';"},
        {pattern: "$", action: "return 'EOF';"}
      ]
    };
    const gen = new Jison.Generator(grammar);
    const parser = gen.createParser();
    parser.lexer = new Lexer(lexData);
    const result = parser.parse('xxw');
    expect(result).toBe("foobar");
  });

});
