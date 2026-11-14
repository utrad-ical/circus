import { styleText } from 'node:util';

const formatHelp = (
  strs: TemplateStringsArray,
  ...substitutions: any[]
): string => {
  // Apply substitutions
  let result = '';
  for (let i = 0; i < strs.raw.length; i++) {
    result += strs.raw[i];
    if (i < substitutions.length) result += String(substitutions[i]);
  }

  // Split lines and apply colors
  const lines = result.split('\n').map(line => {
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^(\s*)((Hints?|Examples?|Warning):)/))) {
      // Heading
      return m[1] + styleText(['bold', 'cyan'], m[2]);
    } else if ((m = line.match(/^(\s*)(#.+)/))) {
      // Comment
      return m[1] + styleText('dim', m[2]);
    }
    return line;
  });

  // Fix indentation
  const depth = Math.min(
    ...lines.map(line => line.match(/^(\s+)\S+/)?.[1].length ?? Infinity)
  );
  if (depth > 0 && depth < Infinity)
    result = lines.map(line => line.slice(depth)).join('\n');

  return `\n${styleText('dim', '-'.repeat(30))}\n` + result;
};

export default formatHelp;
