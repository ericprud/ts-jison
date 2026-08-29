import { JisonLexerApi } from '@ts-jison/lexer';
import { TokenLocation, ParseErrorType, ParseErrorHashType } from '@ts-jison/common';

export interface StateType {
  [key: number]: number | number[]
}

export interface JisonParserApi {
  trace: (str?: string) => void;
  performAction: (yytext: string, yyleng: number, yylineno: number, yy: any, yystate: any /* action[1] */, $$: any /* vstack */, _$: any /* lstack */) => any;
  parseError: ParseErrorType;
  parse: (input: string) => void;
}

export type SymbolsType = { [key: string]: number }

export type TerminalsType = { [key: number]: string }

export type ProductionsType = Array<number | number[]>

export abstract class JisonParser {

  constructor (
    public yy: any = {},
    public lexer?: JisonLexerApi,
  ) { }
  trace(str?: string): any { }

  abstract symbols_: SymbolsType;
  abstract terminals_: TerminalsType;
  abstract productions_: ProductionsType;
  abstract table: Array<StateType>;
  abstract defaultActions: { [key: number]: any };
  abstract performAction(yytext: string, yyleng: number, yylineno: number, yy: any, yystate: number /* action[1] */, $$: any /* vstack */, _$: any /* lstack */): any;

  parseError(str: string, hash: ParseErrorHashType): void {
    if (hash.recoverable) {
      this.trace(str);
    } else {
      var error = new Error(str);
      (<any>error).hash = hash;
      throw error;
    }
  }

  parse(input: string, yy: any = typeof this.yy === 'function' && typeof this.yy.constructor === 'function' ? new this.yy(this, this.lexer) : Object.create(this.yy)) {
    var self = this,
      stack = [0],
      tstack = [], // token stack
      vstack: Array<string | null> = [null], // semantic value stack
      lstack: Array<TokenLocation> = [], // location stack
      table = this.table,
      yytext = '',
      yylineno = 0,
      yyleng = 0,
      recovering = 0,
      TERROR = 2,
      EOF = 1;

    var args = lstack.slice.call(arguments, 1);

    //this.reductionCount = this.shiftCount = 0;
    var lexer: JisonLexerApi = Object.create(this.lexer!) as JisonLexerApi;

    var sharedState = { yy };

    lexer.setInput(input, sharedState.yy);
    (<any>sharedState.yy).lexer = lexer;
    (<any>sharedState.yy).parser = this;
    if (typeof lexer.yylloc == 'undefined') {
      lexer.yylloc = <TokenLocation>{};
    }
    var yyloc = lexer.yylloc;
    lstack.push(yyloc);

    var ranges = lexer.options && lexer.options.ranges;

    if (typeof (<any>sharedState.yy).parseError === 'function') {
      this.parseError = (<any>sharedState.yy).parseError;
    }

    function popStack(n: number) {
      stack.length = stack.length - 2 * n;
      vstack.length = vstack.length - n;
      lstack.length = lstack.length - n;
    }

    var lex = function() {
      var token: number;
      // @ts-ignore
      token = (lexer.lex() || EOF);
      // if token isn't its numeric value, convert
      if (typeof token !== 'number') {
        token = self.symbols_[token] || token;
      }
      return token;
    }

    var symbol: number | null, preErrorSymbol, state, action, a, r, yyval: { '$'?: any, '_$'?: any, lexer?: any } = {}, p, len, newState, expected;
    while (true) {
      // retreive state number from top of stack
      state = stack[stack.length - 1];

      // use default actions if available
      if (this.defaultActions[state]) {
        action = this.defaultActions[state];
      } else {
        if (symbol! === null || typeof symbol! == 'undefined') {
          symbol = lex();
        }
        // read action for current state and first input
        action = table[state] && table[state][symbol];
      }

      _handle_error:
      // handle parse error
      if (typeof action === 'undefined' || !action.length || !action[0]) {
        var error_rule_depth: number | null = null;
        var errStr = '';

        if (!recovering) {
          // first see if there's any chance at hitting an error recovery rule:
          error_rule_depth = locateNearestErrorRecoveryRule(state);

          // Report error
          expected = [];
          for (const _p in table[state]) {
            p = Number(_p);
            if (this.terminals_[p] && p > TERROR) {
              expected.push("'" + this.terminals_[p] + "'");
            }
          }
          if (lexer.showPosition) {
            errStr = 'Parse error on line ' + (yylineno + 1) + ":\n" + lexer.showPosition() + "\nExpecting " + expected.join(', ') + ", got '" + (this.terminals_[symbol!] || symbol!) + "'";
          } else {
            errStr = 'Parse error on line ' + (yylineno + 1) + ": Unexpected " +
              (symbol! == EOF ? "end of input" :
                ("'" + (this.terminals_[symbol!] || symbol!) + "'"));
          }
          this.parseError(errStr, {
            text: lexer.match!,
            token: this.terminals_[symbol!] || symbol!,
            line: lexer.yylineno!,
            loc: lexer.yylloc,
            expected: expected,
            recoverable: (error_rule_depth !== null)
          });
        } else if (preErrorSymbol !== EOF) {
          error_rule_depth = locateNearestErrorRecoveryRule(state);
        }

        // just recovered from another error
        if (recovering == 3) {
          if (symbol! === EOF || preErrorSymbol === EOF) {
            throw new Error(errStr || 'Parsing halted while starting to recover from another error.');
          }

          // discard current lookahead and grab another
          yyleng = lexer.yyleng;
          yytext = lexer.yytext!;
          yylineno = lexer.yylineno!;
          yyloc = lexer.yylloc;
          symbol = lex();
        }

        // try to recover from error
        if (error_rule_depth === null) {
          throw new Error(errStr || 'Parsing halted. No suitable error recovery rule available.');
        }
        popStack(error_rule_depth || 0);

        preErrorSymbol = (symbol! == TERROR ? null : symbol!); // save the lookahead token
        symbol = TERROR;         // insert generic error symbol as new lookahead
        state = stack[stack.length - 1];
        action = table[state] && table[state][TERROR];
        recovering = 3; // allow 3 real symbols to be shifted before reporting a new error
      }

      // this shouldn't happen, unless resolve defaults are off
      if (action[0] instanceof Array && action.length > 1) {
        throw new Error('Parse Error: multiple actions possible at state: ' + state + ', token: ' + symbol!);
      }

      switch (action[0]) {
        case 1: // shift
          //this.shiftCount++;

          stack.push(symbol!);
          vstack.push(lexer.yytext!);
          lstack.push(lexer.yylloc);
          stack.push(action[1]); // push state
          symbol = null;
          if (!preErrorSymbol) { // normal execution/no error
            yyleng = lexer.yyleng;
            yytext = lexer.yytext!;
            yylineno = lexer.yylineno!;
            yyloc = lexer.yylloc;
            if (recovering > 0) {
              recovering--;
            }
          } else {
            // error just occurred, resume old lookahead f/ before error
            symbol = preErrorSymbol;
            preErrorSymbol = null;
          }
          break;

        case 2:
          // reduce
          //this.reductionCount++;

          len = (this.productions_[action[1]] as number[])[1];

          // perform semantic action
          yyval.$ = vstack[vstack.length - len]; // default to $$ = $1
          // Default location: from the first symbol that is really there to
          // the last.  An empty production has no extent, so it must not
          // lend one: reduced, it is placed just before the lookahead (zero
          // width) and marked empty, and a production merging its symbols'
          // locations skips the empty ones -- otherwise `Opt predicate`
          // would start at the token before Opt, and `predicate Opt` end
          // there too.  A production of nothing but empties is itself empty.
          const children = len ? lstack.slice(lstack.length - len) : [];
          const present = children.filter(l => !l.empty);
          if (present.length) {
            const first = present[0], last = present[present.length - 1];
            yyval._$ = {
              first_line: first.first_line,
              last_line: last.last_line,
              first_column: first.first_column,
              last_column: last.last_column
            };
            if (ranges) {
              yyval._$.range = [first.range![0], last.range![1]];
            }
          } else {
            const at = lexer.yylloc;
            yyval._$ = {
              first_line: at.first_line,
              last_line: at.first_line,
              first_column: at.first_column,
              last_column: at.first_column,
              empty: true
            };
            if (ranges) {
              yyval._$.range = [at.range![0], at.range![0]];
            }
          }
          // @ts-ignore
          r = this.performAction.apply(yyval, [yytext, yyleng, yylineno, sharedState.yy, action[1], vstack, lstack].concat(args));

          if (typeof r !== 'undefined') {
            return r;
          }

          // pop off stack
          if (len) {
            stack = stack.slice(0, -1 * len * 2);
            vstack = vstack.slice(0, -1 * len);
            lstack = lstack.slice(0, -1 * len);
          }

          stack.push((this.productions_[action[1]] as number[])[0]);    // push nonterminal (reduce)
          vstack.push(yyval.$);
          lstack.push(yyval._$);
          // goto new state = table[STATE][NONTERMINAL]
          newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
          stack.push(newState as number);
          break;

        case 3:
          // accept
          return true;
      }

    }

    return true;


    // Return the rule stack depth where the nearest error rule can be found.
    // Return FALSE when no error recovery rule was found.
    function locateNearestErrorRecoveryRule(state: number): number | null {
      var stack_probe = stack.length - 1;
      var depth = 0;

      // try to recover from error
      for (; ;) {
        // check for error recovery rule in this state
        if ((TERROR.toString()) in table[state]) {
          return depth;
        }
        if (state === 0 || stack_probe < 2) {
          return null; // No suitable error recovery rule available.
        }
        stack_probe -= 2; // popStack(1): [symbol, action]
        state = stack[stack_probe];
        ++depth;
      }
    }
  }

  /* Function that extends an object with the given value for all given keys
   * e.g., o([1, 3, 4], [6, 7], { x: 1, y: 2 }) = { 1: [6, 7]; 3: [6, 7], 4: [6, 7], x: 1, y: 2 }
   * This is used to docompress parser tables at module load time.
   */
  static expandParseTable (k: number[], v: number[], o?: StateType) {
    let l = k.length;
    for (o = o || {}; l--; o[k[l]] = v)
      ;
    return o;
  }
}

