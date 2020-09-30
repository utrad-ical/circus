import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * This represents an ongoing task (managed by API's taskManager),
 * not an task stored on the database.
 */
interface TaskProgress {
  status: 'processing' | 'finished' | 'error';
  value?: number;
  max?: number;
  message?: string;
}

export interface Tasks {
  [taskId: string]: TaskProgress;
}

const slice = createSlice({
  name: 'taskProgress',
  initialState: {} as Tasks,
  reducers: {
    taskUpdate: (
      state,
      action: PayloadAction<{
        taskId: string;
        updates: Partial<TaskProgress>;
      }>
    ) => {
      const { taskId, updates } = action.payload;
      if (!state[taskId]) state[taskId] = { status: 'processing' };
      state[taskId] = { ...state[taskId], ...updates };
    },
    taskFinish: (state, action: PayloadAction<string>) => {
      const taskId = action.payload;
      state[taskId] = { status: 'finished' };
    },
    taskError: (state, action: PayloadAction<string>) => {
      const taskId = action.payload;
      state[taskId] = { status: 'error' };
    }
  }
});

export default slice.reducer;

export const { taskUpdate, taskFinish, taskError } = slice.actions;
