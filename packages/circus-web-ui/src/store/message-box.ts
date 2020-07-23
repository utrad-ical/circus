import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppThunk } from './index';
import { ReactChild } from 'react';

export interface MessageBox {
  id: string;
  message: ReactChild;
  tag: string | null;
  style: string;
  dismissOnPageChange: boolean;
}

const slice = createSlice({
  name: 'messages',
  initialState: [] as MessageBox[],
  reducers: {
    addMessage: (
      state,
      action: PayloadAction<{
        id: string;
        message: ReactChild;
        tag?: string;
        style?: string;
        dismissOnPageChange?: boolean;
      }>
    ) => {
      const boxes =
        typeof action.payload.tag === 'string'
          ? state.filter(box => box.tag !== action.payload.tag)
          : state;
      boxes.push({
        id: action.payload.id,
        message: action.payload.message,
        tag: typeof action.payload.tag === 'string' ? action.tag : null,
        style: action.payload.style ?? 'info',
        dismissOnPageChange: !!action.payload.dismissOnPageChange
      });
      return boxes;
    },
    dismissMessageOnPageChange: state => {
      return state.filter(box => box.dismissOnPageChange === true);
    },
    dismissMessage: (state, action: PayloadAction<{ id: string }>) => {
      return state.filter(box => box.id !== action.payload.id);
    }
  }
});

export default slice.reducer;

export const {
  addMessage,
  dismissMessageOnPageChange,
  dismissMessage
} = slice.actions;

export const showMessage = (
  message: React.ReactChild,
  style: string = 'info',
  options: { tag?: string; dismissOnPageChange?: boolean; short?: boolean } = {}
): AppThunk => {
  const id = Math.random().toString(); // random message id
  const { tag, dismissOnPageChange, short } = options;
  return async dispatch => {
    dispatch(
      addMessage({
        id,
        message,
        style,
        tag,
        dismissOnPageChange
      })
    );
    if (short) {
      setTimeout(() => dispatch(dismissMessage({ id })), 5000);
    }
  };
};
