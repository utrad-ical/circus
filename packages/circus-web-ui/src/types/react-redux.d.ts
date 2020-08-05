import { RootState } from 'store';

declare module 'react-redux' {
  // This defines the shape of our global state.
  interface DefaultRootState {
    loginUser: RootState['loginUser'];
    messages: RootState['messages'];
    searches: RootState['searches'];
    plugins: RootState['plugins'];
    users: RootState['users'];
  }
}
