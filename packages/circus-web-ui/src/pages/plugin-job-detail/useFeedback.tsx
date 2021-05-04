import React, { useReducer } from 'react';
import { FeedbackEntry } from '@utrad-ical/circus-cs-results';
import moment from 'moment';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import UserDisplay from 'components/UserDisplay';

const registeredMessage = (feedback: FeedbackEntry<any>) => {
  const m = moment(feedback.createdAt);
  const modeStr = feedback.isConsensual ? 'Consensual' : 'Personal';
  return (
    <>
      {modeStr} feedback registered by{' '}
      <UserDisplay userEmail={feedback.userEmail} />{' '}
      <span title={m.format()}>{m.fromNow()}</span>
    </>
  );
};

interface FeedbackState {
  isConsensual: boolean;
  currentData: { [feedbackKey: string]: any };
  valid: boolean;
  count: { total: number; finished: number };
  feedbacks: FeedbackEntry<any>[];
  editable: boolean;
  message?: React.ReactNode;
  myUserEmail: string;
}

const initialState: FeedbackState = {
  isConsensual: false,
  currentData: {},
  valid: false,
  count: { total: 1, finished: 0 },
  editable: false,
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
        state.editable = false;
        return;
      }
      // 2. If current user's personal feedback is registered, show it
      if (myPersonal) {
        state.currentData = myPersonal.data;
        state.message = registeredMessage(myPersonal);
        state.editable = false;
        return;
      }
      // 3. Otherwise, enter personal mode and show empty feedback
      state.editable = true;
    },
    validFeedbackEntered: (state, action: PayloadAction<{ value?: any }>) => {
      const { value } = action.payload;
      state.valid = true;
      state.count = { total: 1, finished: 1 };
      state.currentData = value;
    },
    invalidFeedbackEntered: (
      state,
      action: PayloadAction<{ total: number; finished: number }>
    ) => {
      state.valid = false;
      state.count = action.payload;
    },
    enterConsensualMode: (state, action: PayloadAction<{}>) => {
      state.isConsensual = true;
      // state.disabled = !!consensual;
      // state.canRegister = !consensual && action.payload.canRegister;
      // state.registeredTargetCount = action.payload.registeredTargetCount;
      // state.currentData = consensual ? consensual.data : action.payload.value;
      // state.message = consensual ? registeredMessage(consensual) : '';
    },
    enterPersonalMode: (state, action: PayloadAction<{}>) => {
      // const myPersonal = state.feedbacks.find(
      //   f => !f.isConsensual && f.userEmail === state.myUserEmail
      // );
      state.isConsensual = false;
      // state.disabled = !!myPersonal;
      // state.canRegister = false;
      // state.currentData = myPersonal ? myPersonal.data : {};
      // state.message = myPersonal ? registeredMessage(myPersonal) : '';
    }
  }
});

const useFeedback = () => {
  return useReducer(slice.reducer, initialState);
};

export const actions = slice.actions;

export default useFeedback;
