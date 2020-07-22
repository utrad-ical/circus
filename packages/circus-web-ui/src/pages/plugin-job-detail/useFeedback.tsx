import React, { useReducer } from 'react';
import { FeedbackEntry } from './types';
import moment from 'moment';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const registeredMessage = (feedback: FeedbackEntry<any>) => {
  const m = moment(feedback.createdAt);
  const modeStr = feedback.isConsensual ? 'Consensual' : 'Personal';
  return (
    <>
      {modeStr} feedback registered by {feedback.userEmail}{' '}
      <span title={m.format()}>{m.fromNow()}</span>
    </>
  );
};

interface FeedbackState {
  isConsensual: boolean;
  currentData: { [feedbackKey: string]: any };
  registeredTargetCount: number;
  canRegister: boolean;
  disabled: boolean;
  message?: React.ReactNode;
  feedbacks: FeedbackEntry<any>[];
  myUserEmail: string;
}

const initialState: FeedbackState = {
  isConsensual: false,
  currentData: {},
  registeredTargetCount: 0,
  canRegister: false,
  disabled: true,
  message: null,
  feedbacks: [],
  myUserEmail: ''
};

const slice = createSlice({
  name: 'feedback',
  initialState,
  reducers: {
    reset: (
      state,
      action: PayloadAction<{
        feedbacks: FeedbackEntry<any>[];
        myUserEmail: string;
      }>
    ) => {
      const { feedbacks, myUserEmail } = action.payload;
      state.feedbacks = feedbacks;
      state.myUserEmail = myUserEmail;
      const consensual = action.payload.feedbacks.find(f => f.isConsensual);
      const myPersonal = feedbacks.find(
        f => !f.isConsensual && f.userEmail === myUserEmail
      );
      // 1. If consensual feedback is registered, show it
      if (consensual) {
        state.isConsensual = true;
        state.currentData = consensual.data;
        state.message = registeredMessage(consensual);
        return;
      }
      // 2. If current user's personal feedback is registered, show it
      if (myPersonal) {
        state.currentData = myPersonal.data;
        state.message = registeredMessage(myPersonal);
        return;
      }
      // 3. Otherwise, enter personal mode and show empty feedback
      state.disabled = false;
    },
    changeFeedback: (state, action: PayloadAction<any>) => {
      state.currentData = action.payload.value;
      state.registeredTargetCount = action.payload.registeredTargetCount;
      state.canRegister = action.payload.canRegister;
    },
    enterConsensualMode: (
      state,
      action: PayloadAction<{
        canRegister: boolean;
        registeredTargetCount: number;
        value: any;
      }>
    ) => {
      const consensual = state.feedbacks.find(f => f.isConsensual);
      state.isConsensual = true;
      state.disabled = !!consensual;
      state.canRegister = !consensual && action.payload.canRegister;
      state.registeredTargetCount = action.payload.registeredTargetCount;
      state.currentData = consensual ? consensual.data : action.payload.value;
      state.message = consensual ? registeredMessage(consensual) : '';
    },
    enterPersonalMode: state => {
      const myPersonal = state.feedbacks.find(
        f => !f.isConsensual && f.userEmail === state.myUserEmail
      );
      state.isConsensual = false;
      state.disabled = !!myPersonal;
      state.canRegister = false;
      state.currentData = myPersonal ? myPersonal.data : {};
      state.message = myPersonal ? registeredMessage(myPersonal) : '';
    }
  }
});

const useFeedback = () => {
  return useReducer(slice.reducer, initialState);
};

export const actions = slice.actions;

export default useFeedback;
