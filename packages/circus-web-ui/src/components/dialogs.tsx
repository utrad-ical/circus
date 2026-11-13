import React, {
  type ComponentType,
  type FC,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useState
} from 'react';
import Button, { type ButtonVariant } from './Button.tsx';
import Dialog, { DialogBody, DialogFooter, DialogHeader } from './Dialog.tsx';
import Icon from './Icon.tsx';
import Input from './Input.tsx';

// Promise-based dialogs opened by function calls, rendered by `DialogHost`.
// Use these to ask something and get the result. Place `<Dialog>` instead
// if the content follows changing props or needs a page-level context.

export type DialogContentProps<T> = {
  onResolve: (value: T) => void;
  onReject: (reason?: any) => void;
};

export type DialogContent<T> = ComponentType<DialogContentProps<T>>;

export type DialogOptions = {
  title?: ReactNode;
  icon?: string;
  // Allows closing with Escape or the close button, which resolves with null
  cancelable?: boolean;
  size?: 'large';
};

type Entry = {
  id: number;
  Content: DialogContent<any>;
  dismissable: boolean;
  size?: 'large';
  open: boolean;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
};

let entries: Entry[] = [];
let nextId = 0;
const listeners = new Set<() => void>();

const setEntries = (next: Entry[]) => {
  entries = next;
  listeners.forEach(listener => listener());
};

// Closed entries are kept until `DialogHost` has closed their `<dialog>`,
// so that the browser restores the focus
const close = (id: number) => {
  if (!entries.some(e => e.id === id && e.open)) return false;
  setEntries(entries.map(e => (e.id === id ? { ...e, open: false } : e)));
  return true;
};

/**
 * Opens a dialog with arbitrary content and returns the result via Promise.
 * The content is given `onResolve` and `onReject` to close the dialog.
 */
export const modal = <T,>(
  Content: DialogContent<T>,
  options: { cancelable?: boolean; size?: 'large' } = {}
): Promise<T | null> => {
  const { cancelable = true, size } = options;
  return new Promise((resolve, reject) => {
    const id = nextId++;
    setEntries([
      ...entries,
      {
        id,
        Content,
        dismissable: cancelable,
        size,
        open: true,
        resolve: value => {
          if (close(id)) resolve(value);
        },
        reject: reason => {
          if (close(id)) reject(reason);
        }
      }
    ]);
  });
};

/**
 * Renders the dialogs opened by `modal`, `alert`, etc.
 * Place it once inside the providers of the app.
 */
export const DialogHost: FC = () => {
  const [current, setCurrent] = useState(entries);
  useEffect(() => {
    const listener = () => setCurrent(entries);
    listeners.add(listener);
    listener();
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (current.some(e => !e.open)) setEntries(entries.filter(e => e.open));
  }, [current]);

  return (
    <>
      {current.map(entry => {
        const { id, Content, dismissable, size, open, resolve, reject } = entry;
        return (
          <Dialog
            key={id}
            open={open}
            dismissable={dismissable}
            size={size}
            onClose={() => resolve(null)}
          >
            <Content onResolve={resolve} onReject={reject} />
          </Dialog>
        );
      })}
    </>
  );
};

const Title: FC<{ icon?: string; title: ReactNode }> = props => {
  const { icon, title } = props;
  return (
    <>
      {icon && <Icon icon={icon} />} {title}
    </>
  );
};

type ButtonDef = { response: any; style?: ButtonVariant; autoFocus?: boolean };
type Choices = string[] | { [caption: string]: string | ButtonDef };

/**
 * Opens a dialog with arbitrary buttons and returns the response of the
 * clicked one. Choices can be given in one of the following forms:
 * - `['Green', 'Black']`
 * - `{ Green: 'gr', Black: 'bl' }`
 * - `{ Green: { response: 'gr', style: 'primary' }, Black: { response: 'bl' } }`
 */
export const choice = <T = any,>(
  text: ReactNode,
  choices: Choices,
  options: DialogOptions = {}
): Promise<T | null> => {
  const {
    title = 'Choose',
    icon = 'material-info',
    cancelable = false,
    size
  } = options;
  const buttons: [string, ButtonDef][] = Array.isArray(choices)
    ? choices.map(c => [c, { response: c }])
    : Object.entries(choices).map(([caption, def]) => [
        caption,
        typeof def === 'object' ? def : { response: def }
      ]);
  const ChoiceDialog: DialogContent<T> = props => {
    const { onResolve } = props;
    return (
      <>
        <DialogHeader>
          <Title icon={icon} title={title} />
        </DialogHeader>
        <DialogBody>{text}</DialogBody>
        <DialogFooter>
          {buttons.map(([caption, def]) => (
            <Button
              key={caption}
              variant={def.style}
              data-autofocus={def.autoFocus || undefined}
              onClick={() => onResolve(def.response)}
            >
              {caption}
            </Button>
          ))}
        </DialogFooter>
      </>
    );
  };
  return modal(ChoiceDialog, { cancelable, size });
};

/** Async version of the native `alert` */
export const alert = (
  text: ReactNode,
  options: DialogOptions = {}
): Promise<void> => {
  const { title = 'Message', cancelable = true, ...rest } = options;
  return choice(
    text,
    { OK: { response: true, style: 'primary', autoFocus: true } },
    { title, cancelable, ...rest }
  ).then(() => undefined);
};

/** Async version of the native `confirm`; resolves with false if cancelled */
export const confirm = (
  text: ReactNode,
  options: DialogOptions = {}
): Promise<boolean> => {
  const { title = 'Confirm', cancelable = true, ...rest } = options;
  return choice<boolean>(
    text,
    {
      OK: { response: true, style: 'primary', autoFocus: true },
      Cancel: { response: false, style: 'link' }
    },
    { title, cancelable, ...rest }
  ).then(result => !!result);
};

/**
 * Async version of the native `prompt`; resolves with null if cancelled.
 * `validator` returns an error message for an invalid value.
 */
export const prompt = (
  text: ReactNode,
  value?: string,
  options: DialogOptions & {
    password?: boolean;
    validator?: (value: string) => string | null | undefined;
  } = {}
): Promise<string | null> => {
  const {
    title = 'Input',
    icon = 'material-info',
    cancelable = true,
    size,
    password,
    validator
  } = options;
  const PromptDialog: DialogContent<string | null> = props => {
    const { onResolve } = props;
    const [input, setInput] = useState(value ?? '');
    const error = validator?.(input) ?? null;
    const submit = () => {
      if (error === null) onResolve(input);
    };
    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Enter') submit();
    };
    return (
      <>
        <DialogHeader>
          <Title icon={icon} title={title} />
        </DialogHeader>
        <DialogBody>
          <label htmlFor="circus-prompt-input">{text}</label>
          <Input
            id="circus-prompt-input"
            type={password ? 'password' : 'text'}
            data-autofocus
            value={input}
            onChange={ev => setInput(ev.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={ev => ev.target.select()}
          />
          {error !== null && <div className="text-danger">{error}</div>}
        </DialogBody>
        <DialogFooter>
          <Button variant="primary" disabled={error !== null} onClick={submit}>
            OK
          </Button>
          <Button variant="link" onClick={() => onResolve(null)}>
            Cancel
          </Button>
        </DialogFooter>
      </>
    );
  };
  return modal(PromptDialog, { cancelable, size });
};
