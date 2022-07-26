import pc from 'picocolors';

const SpinnerGlyphs = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export interface Spinner {
  tick: (message?: string) => void;
  stop: (message?: string, isError?: boolean) => void;
  setAutoTick: (enabled: boolean) => void;
}

const eraseLine = '\x1b[2K\r';

const createSpinner = (
  initialMessage: string = '',
  autoTick = false
): Spinner => {
  let phase = 0;
  let timerId: NodeJS.Timer | null = null;
  let message = initialMessage;
  process.stdout.write(pc.cyan(SpinnerGlyphs[phase++]) + '  ' + initialMessage);

  const tick = (newMessage?: string) => {
    // Erase current line
    if (newMessage) message = newMessage;
    process.stdout.write(
      eraseLine +
        pc.cyan(SpinnerGlyphs[phase % SpinnerGlyphs.length]) +
        '  ' +
        message
    );
    phase++;
  };

  const setAutoTick = (enabled: boolean) => {
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
      process.stdout.write(
        eraseLine +
          pc.cyan(isError ? pc.red('X') + message : pc.green('✓')) +
          '  ' +
          message +
          '\n'
      );
      if (timerId) clearTimeout(timerId);
    },
    setAutoTick
  };
};

export default createSpinner;
