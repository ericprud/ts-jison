export interface Bnf {
  start: string,
  moduleInclude: string,
};

type TokenAction = [string, string]; // token, action

export interface Grammar {
  spec: Array<Array<string>>,
  optional_end_block: [ '', '%%' ],
  declaration_list: Array<[string, string]>, // init, assignment, e.g. [ ['declaration_list declaration', '$$ = $1; yy.addDeclaration($$, $2);'], [ '', '$$ = {};' ] ]
  declaration: TokenAction[], // e.g. [ [ 'START id', '$$ = {start: $2};' ], [ 'LEX_BLOCK', '$$ = {lex: $1};' ], ... ]
  options: TokenAction[], // [ [ 'OPTIONS token_list', '$$ = $2;' ] ],
  type: TokenAction[], // [ [ 'TYPE token_list', '{const t = $1.substr($1.indexOf('<') + 1, $1.length - 1);for (const token of $2) {$$[$2] = t;}}' ] ],
  parse_param: TokenAction[], // [ [ 'PARSE_PARAM token_list', '$$ = $2;' ] ],
  operator: TokenAction[], // [ [ 'associativity token_list', '$$ = [$1]; $$.push.apply($$, $2);' ] ],
  associativity: TokenAction[], // [ [ 'LEFT', "$$ = 'left';" ] ]
  token_list: TokenAction[], // [ [ 'token_list symbol', '$$ = $1; $$.push($2);' ], [ 'symbol', '$$ = [$1];' ] ],
  grammar: [ [ 'production_list', '$$ = $1;' ] ],
  production_list: Array<Array<string>>, // [ [ 'production', '$$ = {}; $$[$1[0]] = $1[1];' ] ],
  production: Array<Array<string>>, // [ [ 'id : handle_list ;', '$$ = [$1, $3];' ] ],
  handle_list: TokenAction[], // [ [ 'handle_list | handle_action', '$$ = $1; $$.push($3);' ], [ 'handle_action', '$$ = [$1];' ] ],
  handle_action: Array<Array<string>>, // [ [ 'handle prec action', ] ],
  handle: TokenAction[], // [ [ 'handle expression_suffix', '$$ = $1; $$.push($2)' ], [ '', '$$ = [];' ] ],
  handle_sublist: TokenAction[], // [ [ 'handle_sublist | handle', "$$ = $1; $$.push($3.join(' '));" ], [ 'handle', "$$ = [$1.join(' ')];" ] ],
  expression_suffix: TokenAction[], // [ [ 'expression suffix ALIAS', '$$ = $expression + $suffix + "[" + $ALIAS + "]"; ' ], [ 'expression suffix', '$$ = $expression + $suffix; ' ] ],
  expression: TokenAction[], // [ [ 'ID', '$$ = $1; ' ], [ 'STRING', `$$ = ebnf ? "'" + $1 + "'" : $1; ` ], [ '( handle_sublist )', "$$ = '(' + $handle_sublist.join(' | ') + ')'; " ] ],
  suffix: any, // [ [ '', "$$ = ''" ], '*', '?', '+' ],
  prec: TokenAction[], // [ [ 'PREC symbol', '$$ = {prec: $2};' ], [ '', '$$ = null;' ] ],
  symbol: TokenAction[], // [ [ 'id', '$$ = $1;' ], [ 'STRING', '$$ = yytext;' ] ],
  id: TokenAction[], // [ [ 'ID', '$$ = yytext;' ] ],
  action: TokenAction[], // [ [ '{ action_body }', '$$ = $2;' ], [ 'ACTION', '$$ = $1;' ], [ 'ARROW_ACTION', "$$ = '$$ =' + $1 + ';';" ], [ '', "$$ = '';" ] ],
  action_body: TokenAction[], // [ [ '', "$$ = '';" ], [ 'action_comments_body', '$$ = $1;' ], [ 'action_body { action_body }', '$$ = $1 + $2 + $3 + $4;' ] ],
  action_comments_body: TokenAction[], // [ [ 'ACTION_BODY', ' $$ = yytext; ' ], [ 'action_comments_body ACTION_BODY', ' $$ = $1+$2; ' ] ],
};

export interface BnfWithGrammar extends Bnf {
  bnf: Grammar, // that seems so wrong
};
