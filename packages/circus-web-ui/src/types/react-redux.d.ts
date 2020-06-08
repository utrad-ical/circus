import { MessageBox, LoginUser, Search, Plugins } from 'store';

declare module 'react-redux' {
  // This defines the shape of our global state.
  interface DefaultRootState {
    loginUser: LoginUser;
    messages: MessageBox[];
    searches: { [name: string]: Search };
    plugin: Plugins;
  }
}
