import classnames from 'classnames';
import React, {
  createContext,
  type FC,
  type MouseEvent,
  type ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef
} from 'react';
import Button from './Button.tsx';
import styles from './Dialog.module.css';

const DialogContext = createContext<{ close?: () => void }>({});

/**
 * A modal dialog using the native `<dialog>` element.
 * It is shown in the top layer, so no portal is needed, and the content
 * keeps the React context of where it is placed.
 * The content is rendered only while it is open.
 */
const Dialog: FC<{
  open: boolean;
  onClose?: () => void;
  // Allows closing with Escape, a click on the backdrop or the close button
  dismissable?: boolean;
  size?: 'large';
  className?: string;
  children: ReactNode;
}> = props => {
  const {
    open,
    onClose,
    dismissable = true,
    size,
    className,
    children
  } = props;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  useLayoutEffect(() => {
    const dialog = dialogRef.current!;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const close = dismissable ? onClose : undefined;

  // React 17 types lack `onCancel` for `<dialog>`
  useEffect(() => {
    const dialog = dialogRef.current!;
    const handleCancel = (ev: Event) => {
      // Chrome makes a repeated Escape non-cancelable; see handleClose
      if (!ev.cancelable) return;
      ev.preventDefault();
      close?.();
    };
    const handleClose = () => {
      if (!openRef.current) return;
      if (close) close();
      else dialog.showModal();
    };
    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('close', handleClose);
    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('close', handleClose);
    };
  }, [close]);

  const handleClick = (ev: MouseEvent) => {
    if (ev.target === dialogRef.current) close?.();
  };

  return (
    <dialog
      ref={dialogRef}
      className={classnames(styles.dialog, size && styles[size], className)}
      onClick={handleClick}
    >
      {open && (
        <DialogContext.Provider value={{ close }}>
          <div className={styles.content}>{children}</div>
        </DialogContext.Provider>
      )}
    </dialog>
  );
};

/** The title; shows a close button if the dialog is dismissable */
export const DialogHeader: FC<{ children: ReactNode }> = props => {
  const { children } = props;
  const { close } = useContext(DialogContext);
  return (
    <div className={styles.header}>
      <div>{children}</div>
      {close && (
        <Button
          variant="link"
          size="small"
          icon="material-close"
          title="Close"
          onClick={close}
        />
      )}
    </div>
  );
};

export const DialogBody: FC<{ children: ReactNode }> = props => {
  const { children } = props;
  return <div className={styles.body}>{children}</div>;
};

export const DialogFooter: FC<{ children: ReactNode }> = props => {
  const { children } = props;
  return <div className={styles.footer}>{children}</div>;
};

export default Dialog;
