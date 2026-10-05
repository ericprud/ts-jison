export interface Bnf {
    start: string;
    moduleInclude: string;
}
type TokenAction = [string, string];
export interface Grammar {
    spec: Array<Array<string>>;
    optional_end_block: ['', '%%'];
    declaration_list: Array<[string, string]>;
    declaration: TokenAction[];
    options: TokenAction[];
    type: TokenAction[];
    parse_param: TokenAction[];
    operator: TokenAction[];
    associativity: TokenAction[];
    token_list: TokenAction[];
    grammar: [['production_list', '$$ = $1;']];
    production_list: Array<Array<string>>;
    production: Array<Array<string>>;
    handle_list: TokenAction[];
    handle_action: Array<Array<string>>;
    handle: TokenAction[];
    handle_sublist: TokenAction[];
    expression_suffix: TokenAction[];
    expression: TokenAction[];
    suffix: any;
    prec: TokenAction[];
    symbol: TokenAction[];
    id: TokenAction[];
    action: TokenAction[];
    action_body: TokenAction[];
    action_comments_body: TokenAction[];
}
export interface BnfWithGrammar extends Bnf {
    bnf: Grammar;
}
export {};
//# sourceMappingURL=bnf-types.d.ts.map