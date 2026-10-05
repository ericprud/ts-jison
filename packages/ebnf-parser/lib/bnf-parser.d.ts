import { JisonParser, JisonParserApi, StateType, SymbolsType, TerminalsType, ProductionsType } from '@ts-jison/parser';
export declare class BnfParser extends JisonParser implements JisonParserApi {
    $?: any;
    symbols_: SymbolsType;
    terminals_: TerminalsType;
    productions_: ProductionsType;
    table: Array<StateType>;
    defaultActions: {
        [key: number]: any;
    };
    constructor(yy?: any, lexer?: BnfLexer);
    performAction(yytext: string, yyleng: number, yylineno: number, yy: any, yystate: number, $$: any, _$: any): any;
}
import { JisonLexer, JisonLexerApi } from '@ts-jison/lexer';
type YY_ = {
    yytext: string;
    yyleng: number;
    yylineno: number;
};
export declare class BnfLexer extends JisonLexer implements JisonLexerApi {
    options: any;
    constructor(yy?: any);
    rules: RegExp[];
    conditions: any;
    performAction(yy: any, yy_: YY_, $avoiding_name_collisions: any, YY_START: any): any;
}
export {};
//# sourceMappingURL=bnf-parser.d.ts.map