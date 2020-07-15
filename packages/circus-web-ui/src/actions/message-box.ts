import { store } from 'store';

/*
 * Adds/hides message boxes.
 * By default, message boxes are not closed unless manually dismissed.
 * 'Short' messages are automatically dismissed after 5 seconds.
 */
export const showMessage = (
  message: string,
  style = 'info',
  options: { tag?: string; dismissOnPageChange?: boolean; short?: boolean } = {}
) => {
  const { tag, dismissOnPageChange = true, short = false } = options;
  const id = Math.random().toString(); // random message id
  store.dispatch({
    type: 'MESSAGE_ADD',
    id,
    tag,
    message,
    dismissOnPageChange,
    style
  });
  if (short) {
    setTimeout(() => dismissMessage(id), 5000);
  }
};

export const dismissMessageOnPageChange = () => {
  store.dispatch({
    type: 'MESSAGE_DISMISS_PAGE_CHANGE'
  });
};

/**
 * Hides the spefied message box.
 */
export const dismissMessage = (id: string) => {
  store.dispatch({
    type: 'MESSAGE_DISMISS',
    id
  });
};
