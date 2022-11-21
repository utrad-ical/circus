import React, { useReducer } from 'react';
import { FeedbackEntry } from '@utrad-ical/circus-ui-kit';
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

interface ActionLogEntry {
  /**
   * ISO date representing when this event happened.
   */
  date: string;
  /**
   * Short description of what happened.
   */
  action: string;
  /**
   * Optional JSON-serializable data.
   */
  data?: any;
}

interface FeedbackState {
  isConsensual: boolean;
  currentData: { [feedbackKey: string]: any };
  actionLog: ActionLogEntry[];
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
  actionLog: [],
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
        preferMode: 'personal' | 'consensual' | null;
      }>
    ) => {
      const { feedbacks, myUserEmail, preferMode } = action.payload;
      state.feedbacks = feedbacks;
      state.myUserEmail = myUserEmail;
      state.actionLog = [];
      const consensual = action.payload.feedbacks.find(f => f.isConsensual);
      const myPersonal = feedbacks.find(
        f => !f.isConsensual && f.userEmail === myUserEmail
      );
      // 1. If consensual feedback is registered, show it by default
      if (consensual) {
        if (preferMode === 'personal' && myPersonal) {
          state.currentData = myPersonal.data;
          state.message = registeredMessage(myPersonal);
          state.editable = false;
          return;
        } else {
          state.isConsensual = true;
          state.currentData = consensual.data;
          state.message = registeredMessage(consensual);
          state.editable = false;
          return;
        }
      }
      // 2. If current user's personal feedback is registered show it by default
      if (myPersonal) {
        if (preferMode === 'consensual') {
          state.isConsensual = true;
          state.editable = true;
        } else {
          state.currentData = myPersonal.data;
          state.message = registeredMessage(myPersonal);
          state.editable = false;
          return;
        }
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
      const consensual = state.feedbacks.find(f => f.isConsensual);
      state.isConsensual = true;
      state.editable = !consensual;
      state.currentData = consensual ? consensual.data : {};
      state.message = consensual ? registeredMessage(consensual) : '';
      state.actionLog = [];
    },
    enterPersonalMode: (state, action: PayloadAction<{}>) => {
      const myPersonal = state.feedbacks.find(
        f => !f.isConsensual && f.userEmail === state.myUserEmail
      );
      state.isConsensual = false;
      state.editable = !myPersonal;
      state.currentData = myPersonal ? myPersonal.data : {};
      state.message = myPersonal ? registeredMessage(myPersonal) : '';
      state.actionLog = [];
    },
    logEventHappened: (
      state,
      action: PayloadAction<{
        date: string;
        action: string;
        data?: any;
      }>
    ) => {
      const { date, action: logAction, data } = action.payload;
      const entry: ActionLogEntry = { date, action: logAction };
      if (data) entry.data = data;
      state.actionLog.push(entry);
    }
  }
});

const useFeedback = () => {
  return useReducer(slice.reducer, initialState);
};

export const actions = slice.actions;

export default useFeedback;
