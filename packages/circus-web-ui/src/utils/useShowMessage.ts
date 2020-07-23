import { useDispatch } from 'react-redux';
import React from 'react';
import { showMessage } from 'store/message-box';

interface Options {
  /**
   * An existing box with the same tag, if any, will be
   * automatically dismissed before showing this box.
   */
  tag?: string;
  dismissOnPageChange?: boolean;
  short?: boolean;
}

const useShowMessage = () => {
  const dispatch = useDispatch();
  /**
   * Adds/hides message boxes.
   * By default, message boxes are not closed unless manually dismissed.
   * 'Short' messages are automatically dismissed after 5 seconds.
   */
  const show = (
    message: React.ReactChild,
    style?: string,
    options: Options = {}
  ) => {
    dispatch(showMessage(message, style, options));
  };
  return show;
};

export default useShowMessage;
