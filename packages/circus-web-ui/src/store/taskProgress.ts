import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * This represents an ongoing task (managed by API's taskManager),
 * not an task stored on the database.
 */
interface TaskProgress {
  taskId: string;
  value: number;
  max: number;
  message: string;
}

export interface Tasks {
  [taskId: string]: TaskProgress;
}

const slice = createSlice({
  name: 'taskProgress',
  initialState: {} as Tasks,
  reducers: {
    newTask: (state, action: PayloadAction<{ task: TaskProgress }>) => {
      const { task } = action.payload;
      const taskId = task.taskId;
      state[taskId] = task;
    },
    updateTask: (
      state,
      action: PayloadAction<{
        taskId: string;
        updates: Partial<TaskProgress>;
      }>
    ) => {
      const { taskId, updates } = action.payload;
      if (!state[taskId]) return;
      state[taskId] = { ...state[taskId], ...updates };
    },
    deleteTask: (state, action: PayloadAction<string>) => {
      delete state[action.payload];
    }
  }
});

export default slice.reducer;

export const { newTask, updateTask, deleteTask } = slice.actions;
