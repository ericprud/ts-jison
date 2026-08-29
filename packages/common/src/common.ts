export interface TokenLocation {
  first_line: number;
  first_column: number;
  last_line: number;
  last_column: number;
  /** where the numbers are indexes into the input string, regular zero-based */
  range?: [number, number];
  /** a production of nothing: placed, but with no extent to lend the
   * production it is part of (see the parser's reduce) */
  empty?: boolean;
}

export type ParseErrorType = (str: string, hash: ParseErrorHashType) => void;

export type ParseErrorHashType = {
  /** matched text */
  text: string;
  /** the produced terminal token, if any */
  token: string | number;
  /** yylineno */
  line: number;
  /** yylloc */
  loc: TokenLocation;
  /** string describing the set of expected tokens */
  expected: string[];
  /** TRUE when the parser has a error recovery rule available for this particular error */
  recoverable: boolean;
}
