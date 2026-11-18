import type { ProgressLogLevel } from '@utrad-ical/circus-api-schema';
import { styleText } from 'node:util';

const isTTY = process.stdout.isTTY && process.stdout.columns > 0;
const spinnerGlyphs = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const eraseLine = '\x1b[2K\r';
const eraseBelow = '\r\x1b[J';

export interface Spinner {
  update: (message?: string) => void;
  /** Shows a line in the log pane (or just prints it in non-TTY) */
  log: (line: string, level?: ProgressLogLevel) => void;
  stop: (message?: string, isError?: boolean) => void;
}

const logColors = { info: 'gray', warn: 'yellow', error: 'red' } as const;

/** Cuts a string to fit the width, counting wide characters as 2 */
const fit = (str: string, width: number) => {
  const chars = Array.from(str);
  const widthOf = (ch: string) => (ch.codePointAt(0)! >= 0x1100 ? 2 : 1);
  if (chars.reduce((w, ch) => w + widthOf(ch), 0) <= width) return str;
  let result = '';
  let w = 0;
  for (const ch of chars) {
    if (w + widthOf(ch) > width - 1) break;
    result += ch;
    w += widthOf(ch);
  }
  return result + '…';
};

const createSpinner = (
  initialMessage: string = '',
  {
    hideInNonTTY = true,
    paneLines = 0
  }: {
    hideInNonTTY?: boolean;
    /** Number of recent log lines shown below the spinner */
    paneLines?: number;
  } = {}
): Spinner => {
  let phase = 0;
  let timerId: NodeJS.Timeout | null = null;
  let message = initialMessage;
  let stopped = false;
  let pane: { line: string; level: ProgressLogLevel }[] = [];

  const newProgressGlyph = () =>
    styleText(
      'cyan',
      isTTY ? spinnerGlyphs[phase++ % spinnerGlyphs.length] : '>>'
    );

  const putLine = (
    message: string,
    glyph = newProgressGlyph(),
    initial = false
  ) => {
    if (isTTY && paneLines) {
      // Redraw the spinner and the pane, and go back to the spinner line
      const width = process.stdout.columns - 1;
      let out = eraseBelow + glyph + ' ' + fit(message, width - 2);
      for (const { line, level } of pane)
        out += '\n' + styleText(logColors[level], fit(line, width));
      if (pane.length) out += `\x1b[${pane.length}A\r`;
      process.stdout.write(out);
    } else if (isTTY) {
      process.stdout.write((initial ? '' : eraseLine) + glyph + ' ' + message);
    } else {
      if (!hideInNonTTY) {
        process.stdout.write((initial ? '' : '\n') + glyph + ' ' + message);
      }
    }
  };

  putLine(initialMessage, undefined, true);

  const update = (newMessage?: string) => {
    if (newMessage) message = newMessage;
    putLine(message);
  };

  const log = (line: string, level: ProgressLogLevel = 'info') => {
    if (stopped) return;
    if (isTTY && paneLines) {
      pane = [...pane, { line, level }].slice(-paneLines);
    } else {
      console.log(level === 'info' ? line : styleText(logColors[level], line));
    }
  };

  const tick = () => {
    putLine(message);
  };

  if (isTTY) {
    timerId = setInterval(tick, 100);
  }

  return {
    update,
    log,
    stop: (message = 'Done', isError = false) => {
      if (stopped) return;
      stopped = true;
      pane = []; // erased by the redraw below
      const glyph = isError ? styleText('red', '✖') : styleText('green', '✓');
      // The result is shown even when the progress is hidden
      if (!isTTY && hideInNonTTY) console.log(glyph + ' ' + message);
      else putLine(message, glyph);
      if (isTTY) process.stdout.write('\n');
      if (timerId) clearTimeout(timerId);
    }
  };
};

export default createSpinner;
