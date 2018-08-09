/*
 * Adds/hides message boxes.
 * By default, message boxes are not closed unless manually dismissed.
 * 'Short' messages are automatically dismissed after 5 seconds.
 */
export function showMessage(
  message,
  style,
  { tag, dismissOnPageChange = true, short = false } = {}
) {
  return dispatch => {
    const id = Math.random().toString(); // random message id
    dispatch({
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
}

export function dismissMessageOnPageChange() {
  return dispatch => {
    dispatch({
      type: 'MESSAGE_DISMISS_PAGE_CHANGE'
    });
  };
}

/**
 * Hides the spefied message box.
 */
export function dismissMessage(id) {
  return dispatch => {
    dispatch({
      type: 'MESSAGE_DISMISS',
      id
    });
  };
}
