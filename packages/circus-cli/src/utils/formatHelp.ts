import pc from 'picocolors';

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
      return m[1] + pc.bold(pc.cyan(m[2]));
    } else if ((m = line.match(/^(\s*)(#.+)/))) {
      // Comment
      return m[1] + pc.dim(m[2]);
    }
    return line;
  });

  // Fix indentation
  const depth = Math.min(
    ...lines.map(line => line.match(/^(\s+)\S+/)?.[1].length ?? Infinity)
  );
  if (depth > 0 && depth < Infinity)
    result = lines.map(line => line.slice(depth)).join('\n');

  return `\n${pc.dim('-'.repeat(30))}\n` + result;
};

export default formatHelp;
