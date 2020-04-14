// Additional validator functions which are specific to CIRCUS RS projects

/**
 * Generates a validator function which checks the input is
 * a valid number tuple (eg. '2,3,5')
 * @param count
 * @returns {(s:string)=>(boolean|boolean)}
 */
export function isTuple(count: number = 3): (input: string) => boolean {
  return (s: string) => {
    if (typeof s !== 'string') return false;
    const toks = s.split(',');
    if (toks.length !== count) return false;
    return !toks.some(tok => isNaN(parseFloat(tok)));
  };
}

/**
 * Generates a validator function which returns an array of numbers
 * from a tuple string
 * @param count The number of elements
 * @param int Whether to parse each string as an integer
 * @returns {(s:string)=>number[]}
 */
export function parseTuple(
  count: number = 3,
  int: boolean = false
): (input: string) => number[] {
  return (s: string) =>
    s
      .split(',')
      .map(f => (int ? parseInt(f, 10) : parseFloat(f)))
      .slice(0, count);
}

export function parseBoolean(input: string): boolean {
  return !/^(0|false|f|no|)$/i.test(input);
}
