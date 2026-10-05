import { TokenLocation, ParseErrorType, ParseErrorHashType } from '@ts-jison/common';

interface YY {
  parser?: {
    parseError: ParseErrorType
  };
}

export interface JisonLexerApi {
  EOF: number;
  parseError: ParseErrorType;
  setInput: (input: string, yy: any) => JisonLexerApi;
  input: () => string;
  unput: (str: string) => JisonLexerApi;
  more: () => JisonLexerApi;
  less: (n: number) => void;
  pastInput: () => string;
  upcomingInput: () => string;
  showPosition: () => string;
  test_match: (regex_match_array: RegExpMatchArray | null, rule_index: any) => string | number | false;
  next: () => number | boolean;
  lex: () => number | boolean;
  begin: (condition: string) => void;
  popState: () => string;
  _currentRules: () => number[];
  topState: (n: number) => string;
  pushState: (condition: string) => void;
  options: {
    /** token location info will include a .range[] member */
    ranges?: boolean;
    /** flex-like lexing behaviour where the rules are tested exhaustively to find the longest match */
    flex?: boolean;
    /** lexer regexes are tested in order and for each matching regex the action code is invoked; the lexer terminates the scan when a token is returned by the action code */
    backtrack_lexer?: boolean;
  };

  performAction: (yy: YY, yy_: any, $avoiding_name_collisions: number, YY_START: any) => any;
  rules: RegExp[];
  conditions: { [name: string]: number[] /* set */ };
  yy?: YY;
  reject: () => JisonLexerApi;
  stateStackSize: () => number;
  yylloc: TokenLocation;
  yyleng: number;
  yytext?: string;
  match?: string;
  yylineno: number;
}

export abstract class JisonLexer {
  constructor (
    public yy: YY = {},
  ) { }

  public EOF: number = 1;
  options: any = {};

  _input?: string;
  _more?: boolean;
  _backtrack?: boolean;
  done?: boolean;
  yylineno: number;
  yyleng: number = 0;
  yytext?: string;
  conditionStack?: string[];
  match?: string;
  matches?: RegExpMatchArray | null;
  matched?: string;
  yylloc: TokenLocation = {
    first_line: 1,
    first_column: 0,
    last_line: 1,
    last_column: 0
  };
  offset?: number;

  parseError(str: string, hash: ParseErrorHashType): void | never {
    if (this.yy.parser) {
      this.yy.parser.parseError(str, hash);
    } else {
      throw new Error(str);
    }
  }

  // resets the lexer, sets new input
  setInput(input: string, yy: any): JisonLexer {
    this.yy = yy || this.yy || {};
    this._input = input;
    this._more = this._backtrack = this.done = false;
    this.yylineno = this.yyleng = 0;
    this.yytext = this.matched = this.match = '';
    this.conditionStack = ['INITIAL'];
    this.yylloc = {
      first_line: 1,
      first_column: 0,
      last_line: 1,
      last_column: 0
    };
    if (this.options.ranges) {
      this.yylloc.range = [0, 0];
    }
    this.offset = 0;
    return this;
  }

  // consumes and returns one char from the input
  input(): string {
    if (this._input!.length === 0) {
      this.done = true;
      return '' + this.EOF;
    }
    var ch = this._input![0];
    this.yytext += ch;
    this.yyleng++;
    this.offset!++;
    this.match += ch;
    this.matched += ch;
    var lines = ch.match(/(?:\r\n?|\n).*/g);
    if (lines) {
      this.yylineno!++;
      this.yylloc.last_line++;
    } else {
      this.yylloc.last_column++;
    }
    if (this.options.ranges) {
      this.yylloc.range![1]++;
    }

    this._input = this._input!.slice(1);
    return ch;
  }

  // unshifts one char (or a string) into the input
  unput(ch: string): JisonLexer {
    var len = ch.length;
    var lines = ch.split(/(?:\r\n?|\n)/g);

    this._input = ch + this._input;
    this.yytext = this.yytext!.substr(0, this.yytext!.length - len);
    //this.yyleng -= len;
    this.offset! -= len;
    var oldLines = this.match!.split(/(?:\r\n?|\n)/g);
    this.match = this.match!.substr(0, this.match!.length - 1);
    this.matched = this.matched!.substr(0, this.matched!.length - 1);

    if (lines.length - 1) {
      this.yylineno! -= lines.length - 1;
    }
    var r = this.yylloc.range;

    var yylloc: TokenLocation = {
      first_line: this.yylloc.first_line,
      last_line: this.yylineno! + 1,
      first_column: this.yylloc.first_column,
      last_column: lines ?
        (lines.length === oldLines.length ? this.yylloc.first_column : 0)
        + oldLines[oldLines.length - lines.length].length - lines[0].length :
        this.yylloc.first_column - len
    };
    this.yylloc = yylloc;

    if (this.options.ranges) {
      this.yylloc.range = [r![0], r![0] + this.yyleng - len];
    }
    this.yyleng = this.yytext.length;
    return this;
  }

  // When called from action, caches matched text and appends it on next action
  more(): JisonLexer {
    this._more = true;
    return this;
  }

  // When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.
  reject(): JisonLexer {
    if (this.options.backtrack_lexer) {
      this._backtrack = true;
    } else {
      this.parseError('Lexical error on line ' + (this.yylineno! + 1) + '. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n' + this.showPosition(), {
        text: "",
        token: null,
        line: this.yylineno,
        loc: this.yylloc,
        recoverable: false,
        expected: null
      });

    }
    return this;
  }

  // retain first n characters of the match
  less(n: number): void {
    this.unput(this.match!.slice(n));
  }

  // displays already matched input, i.e. for error messages
  pastInput(): string {
    var past = this.matched!.substr(0, this.matched!.length - this.match!.length);
    return (past.length > 20 ? '...' : '') + past.substr(-20).replace(/\n/g, "");
  }

  // displays upcoming input, i.e. for error messages
  upcomingInput() {
    var next = this.match;
    if (next!.length < 20) {
      next += this._input!.substr(0, 20 - next!.length);
    }
    return (next!.substr(0, 20) + (next!.length > 20 ? '...' : '')).replace(/\n/g, "");
  }

  // displays the character position where the lexing error occurred, i.e. for error messages
  showPosition() {
    var pre = this.pastInput();
    var c = new Array(pre.length + 1).join("-");
    return pre + this.upcomingInput() + "\n" + c + "^";
  }

  // test the lexed token: return FALSE when not a match, otherwise return token
  test_match(match: RegExpMatchArray | null, indexed_rule: any) {
    var token,
      lines,
      backup: JisonLexerApi;

    if (this.options.backtrack_lexer) {
      // save context
      backup = <any>{
        yylineno: this.yylineno!,
        yylloc: {
          first_line: this.yylloc.first_line,
          last_line: this.yylloc.last_line,
          first_column: this.yylloc.first_column,
          last_column: this.yylloc.last_column
        },
        yytext: this.yytext,
        match: this.match,
        matches: this.matches,
        matched: this.matched,
        yyleng: this.yyleng,
        offset: this.offset,
        _more: this._more,
        _input: this._input,
        yy: this.yy,
        conditionStack: this.conditionStack!.slice(0),
        done: this.done
      };
      if (this.options.ranges) {
        backup.yylloc.range = <[number, number]>(this.yylloc.range!.slice(0));
      }
    }

    lines = match![0].match(/(?:\r\n?|\n).*/g);
    if (lines) {
      this.yylineno! += lines.length;
    }
    this.yylloc = {
      first_line: this.yylloc.last_line,
      last_line: this.yylineno! + 1,
      first_column: this.yylloc.last_column,
      last_column: lines ?
        lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)![0].length :
        this.yylloc.last_column + match![0].length
    };
    this.yytext += match![0];
    this.match += match![0];
    this.matches = match;
    this.yyleng = this.yytext!.length;
    if (this.options.ranges) {
      this.yylloc.range = [this.offset!, this.offset! += this.yyleng];
    }
    this._more = false;
    this._backtrack = false;
    this._input = this._input!.slice(match![0].length);
    this.matched += match![0];
    token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack![this.conditionStack!.length - 1]);
    if (this.done && this._input) {
      this.done = false;
    }
    if (token) {
      return token;
    } else if (this._backtrack) {
      // recover context
      for (var k in backup!) { // what's the typescript-y way to copy fields across?
        (<any>this)[k] = (<any>backup)[k];
      }
      return false; // rule action called reject() implying the next rule should be tested instead.
    }
    return false;
  }

  // return next match in input
  next(): number | boolean | undefined {
    if (this.done) {
      return this.EOF;
    }
    if (!this._input) {
      this.done = true;
    }

    var token,
      match: RegExpMatchArray | null = null,
      tempMatch: RegExpMatchArray | null,
      index: number;
    if (!this._more) {
      this.yytext = '';
      this.match = '';
    }
    var rules = this._currentRules();
    for (var i = 0; i < rules.length; i++) {
      tempMatch = this._input!.match(this.rules[rules[i]]);
      if (tempMatch && (!match || tempMatch[0].length > match![0].length)) {
        match = tempMatch;
        index = i;
        if (this.options.backtrack_lexer) {
          token = this.test_match(tempMatch, rules[i]);
          if (token !== false) {
            return <number | boolean>token;
          } else if (this._backtrack) {
            match = null;
            continue; // rule action called reject() implying a rule MISmatch.
          } else {
            // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
            return false;
          }
        } else if (!this.options.flex) {
          break;
        }
      }
    }
    if (match) {
      token = this.test_match(match, rules[index!]);
      if (token !== false) {
        return <number | boolean>token;
      }
      // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
      return false;
    }
    if (this._input === "") {
      return this.EOF;
    } else {
      this.parseError('Lexical error on line ' + (this.yylineno! + 1) + '. Unrecognized text.\n' + this.showPosition(), {
        text: "",
        token: null,
        line: this.yylineno,
        loc: this.yylloc,
        recoverable: false,
        expected: []
      });
    }
  }

  // return next match that has a token
  lex(): number | boolean {
    var r = this.next();
    if (r) {
      return r;
    } else {
      return this.lex();
    }
  }

  // activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)
  begin(condition: string) {
    this.conditionStack!.push(condition);
  }

  // pop the previously active lexer condition state off the condition stack
  popState(): string {
    var n = this.conditionStack!.length - 1;
    if (n > 0) {
      return this.conditionStack!.pop()!;
    } else {
      return this.conditionStack![0];
    }
  }

  // produce the lexer rule set which is active for the currently active lexer condition state
  _currentRules() {
    if (this.conditionStack!.length && this.conditionStack![this.conditionStack!.length - 1]) {
      return this.conditions[this.conditionStack![this.conditionStack!.length - 1]].rules;
    } else {
      return this.conditions["INITIAL"].rules;
    }
  }

  // return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available
  topState(n: number) {
    n = this.conditionStack!.length! - 1 - Math.abs(n || 0);
    if (n >= 0) {
      return this.conditionStack![n];
    } else {
      return "INITIAL";
    }
  }

  // alias for begin(condition)
  pushState(condition: string) {
    this.begin(condition);
  }

  // return the number of states currently on the stack
  stateStackSize(): number {
    return this.conditionStack!.length;
  }

  abstract performAction(yy: any, yy_: any, $avoiding_name_collisions: any, YY_START: any): any;

  abstract rules: RegExp[];

  abstract conditions: any
}
