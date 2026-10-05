%lex

id                [a-zA-Z][a-zA-Z0-9_-]*


%x action code
%s bnf ebnf

%%

<bnf,ebnf>"%%"          this.pushState('code');return '%%';

<ebnf>"("               return '(';
<ebnf>")"               return ')';
<ebnf>"*"               return '*';
<ebnf>"?"               return '?';
<ebnf>"+"               return '+';

\s+                     /* skip whitespace */
"//".*                  /* skip comment */
"/*"(.|\n|\r)*?"*/"     /* skip comment */
"["{id}"]"              yytext = yytext.substr(1, yyleng-2); return 'ALIAS';
{id}                    return 'ID';
'"'[^"]+'"'             yytext = yytext.substr(1, yyleng-2); return 'STRING';
"'"[^']+"'"             yytext = yytext.substr(1, yyleng-2); return 'STRING';
":"                     return ':';
";"                     return ';';
"|"                     return '|';
"%%"                    this.pushState(ebnf ? 'ebnf' : 'bnf'); return '%%';
"%ebnf"                 if (!yy.options) yy.options = {}; ebnf = yy.options.ebnf = true;
"%prec"                 return 'PREC';
"%start"                return 'START';
"%left"                 return 'LEFT';
"%right"                return 'RIGHT';
"%nonassoc"             return 'NONASSOC';
"%parse-param"          return 'PARSE_PARAM';
"%options"              return 'OPTIONS';
"%type"[\W]+"<"[^<>]*("<"[^<>]*">")*[^<>]*">" 
                        return 'TYPES';

/* []s around '%' and '/' allow jison to parse its on grammar */
[%]"lex"[\w\W]*?[/]"lex" return 'LEX_BLOCK';
"%"[a-zA-Z]+[^\r\n]*    /* ignore unrecognized decl */
"<"[a-zA-Z]*">"         /* ignore type */
"{{"[\w\W]*?"}}"        yytext = yytext.substr(2, yyleng-4); return 'ACTION';
"%{"(.|\r|\n)*?"%}"     yytext = yytext.substr(2, yytext.length-4); return 'ACTION';
"{"                     yy.depth = 0; this.pushState('action'); return '{';
"->".*                  yytext = yytext.substr(2, yyleng-2); return 'ARROW_ACTION';
.                       /* ignore bad characters */
<*><<EOF>>              return 'EOF';

<action>"/*"(.|\n|\r)*?"*/"           return 'ACTION_BODY';
<action>"//".*                        return 'ACTION_BODY';
<action>"/"[^ /]*?['"{}'][^ ]*?"/"    return 'ACTION_BODY'; // regexp with braces or quotes (and no spaces)
<action>\"("\\\\"|'\"'|[^"])*\"       return 'ACTION_BODY';
<action>"'"("\\\\"|"\'"|[^'])*"'"     return 'ACTION_BODY';
<action>[/"'][^{}/"']+                return 'ACTION_BODY';
<action>[^{}/"']+                     return 'ACTION_BODY';
<action>"{"                           yy.depth++; return '{';
<action>"}"                           if (yy.depth==0) this.begin(ebnf ? 'ebnf' : 'bnf'); else yy.depth--; return '}';

<code>(.|\n|\r)+         return 'CODE';

/lex

%start spec

/* grammar for parsing jison grammar files */

%{
// import {transform} from './ebnf-parser';
const transform = require('../ebnf-transform').transform;
import {Bnf, Grammar, BnfWithGrammar} from './bnf-types';
let ebnf = false;
%}

%%

spec
    : declaration_list '%%' grammar optional_end_block EOF
        {
          $$ = $1;
          return extend($$, $3);
        }
    | declaration_list '%%' grammar '%%' CODE EOF
        {
          $$ = $1;
          yy.addDeclaration($$, { include: $5 });
          return extend($$, $3);
        }
    ;

optional_end_block
    :
    | '%%'
    ;

declaration_list
    : declaration_list declaration
        {$$ = $1; yy.addDeclaration($$, $2);}
    |
        {$$ = {};}
    ;

declaration
    : START id
        {$$ = {start: $2};}
    | LEX_BLOCK
        {$$ = {lex: $1};}
    | operator
        {$$ = {operator: $1};}
    | ACTION
        {$$ = {include: $1};}
    | parse_param
        {$$ = {parseParam: $1};}
    | options
        {$$ = {options: $1};}
    | type
        {$$ = {type: $1};}
    ;

options
    : OPTIONS token_list
        {$$ = $2;}
    ;

type
    : TYPES token_list
        { {const t = $1.substring($1.indexOf('<') + 1, $1.lastIndexOf('>')); $$ = {}; for (const token of $2) {$$[token] = t;}} }
    ;

parse_param
    : PARSE_PARAM token_list
        {$$ = $2;}
    ;

operator
    : associativity token_list
        {$$ = [$1]; $$.push.apply($$, $2);}
    ;

associativity
    : LEFT
        {$$ = 'left';}
    | RIGHT
        {$$ = 'right';}
    | NONASSOC
        {$$ = 'nonassoc';}
    ;

token_list
    : token_list symbol
        {$$ = $1; $$.push($2);}
    | symbol
        {$$ = [$1];}
    ;

grammar
    : production_list
        {$$ = $1;}
    ;

production_list
    : production_list production
        {
            $$ = $1;
            if ($2[0] in $$) 
                $$[$2[0]] = $$[$2[0]].concat($2[1]);
            else
                $$[$2[0]] = $2[1];
        }
    | production
        {$$ = {}; $$[$1[0]] = $1[1];}
    ;

production
    : id ':' handle_list ';'
        {$$ = [$1, $3];}
    ;

handle_list
    : handle_list '|' handle_action
        {$$ = $1; $$.push($3);}
    | handle_action
        {$$ = [$1];}
    ;

handle_action
    : handle prec action
        {
            $$ = [($1.length ? $1.join(' ') : '')];
            if($3) $$.push($3);
            if($2) $$.push($2);
            if ($$.length === 1) $$ = $$[0];
        }
    ;

handle
    : handle expression_suffix
        {$$ = $1; $$.push($2)}
    |
        {$$ = [];}
    ;

handle_sublist
    : handle_sublist '|' handle
        {$$ = $1; $$.push($3.join(' '));}
    | handle
        {$$ = [$1.join(' ')];}
    ;

expression_suffix
    : expression suffix ALIAS
        {$$ = $expression + $suffix + "[" + $ALIAS + "]"; }
    | expression suffix
        {$$ = $expression + $suffix; }
    ;

expression
    : ID
        {$$ = $1; }
    | STRING
        {$$ = ebnf ? "'" + $1 + "'" : $1; }
    | '(' handle_sublist ')'
        {$$ = '(' + $handle_sublist.join(' | ') + ')'; }
    ;

suffix
    : {$$ = ''}
    | '*'
    | '?'
    | '+'
    ;

prec
    : PREC symbol
        {$$ = {prec: $2};}
    |
        {$$ = null;}
    ;

symbol
    : id
        {$$ = $1;}
    | STRING
        {$$ = yytext;}
    ;

id
    : ID
        {$$ = yytext;}
    ;

action
    : '{' action_body '}'
        {$$ = $2;}
    | ACTION
        {$$ = $1;}
    | ARROW_ACTION
        {$$ = '$$ =' + $1 + ';';}
    |
        {$$ = '';}
    ;

action_body
    :
        {$$ = '';}
    | action_comments_body
        {$$ = $1;}
    | action_body '{' action_body '}' action_comments_body
        {$$ = $1 + $2 + $3 + $4 + $5;}
    | action_body '{' action_body '}'
        {$$ = $1 + $2 + $3 + $4;}
    ;

action_comments_body
    : ACTION_BODY
        { $$ = yytext; }
    | action_comments_body ACTION_BODY
        { $$ = $1+$2; }
    ;

%%

// transform ebnf to bnf if necessary
function extend (json: Bnf, grammar: Grammar): BnfWithGrammar {
    (json as BnfWithGrammar).bnf = ebnf ? transform(grammar) : grammar;
    return json as BnfWithGrammar;
}

