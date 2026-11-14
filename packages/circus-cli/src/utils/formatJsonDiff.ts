import { structuredPatch } from 'diff';
import { styleText } from 'node:util';

const toText = (value: unknown) => JSON.stringify(value, null, 2) + '\n';

/**
 * Returns a colored line diff of two values serialized as JSON.
 */
const formatJsonDiff = (
  before: unknown,
  after: unknown,
  labels: { before: string; after: string },
  context = 5
) => {
  const patch = structuredPatch('', '', toText(before), toText(after), '', '', {
    context
  });
  const out = [
    styleText('red', `- ${labels.before}`),
    styleText('green', `+ ${labels.after}`),
    ''
  ];
  for (const hunk of patch.hunks) {
    out.push(
      styleText(
        'yellow',
        `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`
      )
    );
    for (const line of hunk.lines) {
      const [mark, text] = [line[0], line.slice(1)];
      if (mark === '-') out.push(styleText('red', `- ${text}`));
      else if (mark === '+') out.push(styleText('green', `+ ${text}`));
      else if (mark === ' ') out.push(`  ${text}`);
    }
  }
  return out.join('\n');
};

export default formatJsonDiff;
