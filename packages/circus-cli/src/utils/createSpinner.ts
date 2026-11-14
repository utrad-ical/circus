import pc from 'picocolors';

const isTTY = process.stdout.isTTY && process.stdout.columns > 0;
const spinnerGlyphs = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const eraseLine = '\x1b[2K\r';

export interface Spinner {
  update: (message?: string) => void;
  stop: (message?: string, isError?: boolean) => void;
}

const createSpinner = (
  initialMessage: string = '',
  { hideInNonTTY = true }: { hideInNonTTY?: boolean } = {}
): Spinner => {
  let phase = 0;
  let timerId: NodeJS.Timer | null = null;
  let message = initialMessage;
  let stopped = false;

  const newProgressGlyph = () =>
    pc.cyan(isTTY ? spinnerGlyphs[phase++ % spinnerGlyphs.length] : '>>');

  const putLine = (
    message: string,
    glyph = newProgressGlyph(),
    initial = false
  ) => {
    if (isTTY) {
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

  const tick = () => {
    putLine(message);
  };

  if (isTTY) {
    timerId = setInterval(tick, 100);
  }

  return {
    update,
    stop: (message = 'Done', isError = false) => {
      if (stopped) return;
      stopped = true;
      putLine(message, isError ? pc.red('✖') : pc.green('✓'));
      if (isTTY) process.stdout.write('\n');
      if (timerId) clearTimeout(timerId);
    }
  };
};

export default createSpinner;
