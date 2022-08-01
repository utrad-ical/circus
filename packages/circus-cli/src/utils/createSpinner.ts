import pc from 'picocolors';

const isTTY = process.stdout.isTTY && process.stdout.columns > 0;
const spinnerGlyphs = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const eraseLine = '\x1b[2K\r';

export interface Spinner {
  tick: (message?: string) => void;
  stop: (message?: string, isError?: boolean) => void;
  setAutoTick: (enabled: boolean) => void;
}

const createSpinner = (
  initialMessage: string = '',
  autoTick = false
): Spinner => {
  let phase = 0;
  let timerId: NodeJS.Timer | null = null;
  let message = initialMessage;
  process.stdout.write(pc.cyan(spinnerGlyphs[phase++]) + '  ' + initialMessage);

  const putLine = (glyph: string, message: string) => {
    if (isTTY) {
      process.stdout.write(eraseLine + glyph + ' ' + message);
    } else {
      process.stdout.write('\n' + glyph + ' ' + message);
    }
  };

  const tick = (newMessage?: string) => {
    if (newMessage) message = newMessage;
    putLine(
      pc.cyan(isTTY ? spinnerGlyphs[phase++ % spinnerGlyphs.length] : '>>'),
      message
    );
  };

  const setAutoTick = (enabled: boolean) => {
    if (!isTTY) return;
    if (enabled) {
      if (!timerId) timerId = setInterval(tick, 100);
    } else {
      if (timerId) clearInterval(timerId);
      timerId = null;
    }
  };

  if (autoTick) setAutoTick(true);

  return {
    tick,
    stop: (message = 'Done', isError) => {
      putLine(isError ? pc.red('✖') : pc.green('✓'), message);
      process.stdout.write('\n');
      if (timerId) clearTimeout(timerId);
    },
    setAutoTick
  };
};

export default createSpinner;
