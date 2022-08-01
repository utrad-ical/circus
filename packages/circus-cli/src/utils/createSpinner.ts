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
  process.stdout.write(pc.cyan(spinnerGlyphs[phase++]) + '  ' + initialMessage);

  const putLine = (glyph: string, message: string) => {
    if (isTTY) {
      process.stdout.write(eraseLine + glyph + ' ' + message);
    } else {
      if (!hideInNonTTY) {
        process.stdout.write('\n' + glyph + ' ' + message);
      }
    }
  };

  const update = (newMessage?: string) => {
    if (newMessage) message = newMessage;
    putLine(
      pc.cyan(isTTY ? spinnerGlyphs[phase % spinnerGlyphs.length] : '>>'),
      message
    );
  };

  const tick = () => {
    putLine(
      pc.cyan(isTTY ? spinnerGlyphs[phase++ % spinnerGlyphs.length] : '>>'),
      message
    );
  };

  if (isTTY) {
    timerId = setInterval(tick, 100);
  }

  return {
    update,
    stop: (message = 'Done', isError) => {
      putLine(isError ? pc.red('✖') : pc.green('✓'), message);
      process.stdout.write('\n');
      if (timerId) clearTimeout(timerId);
    }
  };
};

export default createSpinner;
