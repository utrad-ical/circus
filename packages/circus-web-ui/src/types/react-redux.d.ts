import { MessageBox, LoginUser, Search, Plugins, Users } from 'store';

declare module 'react-redux' {
  // This defines the shape of our global state.
  interface DefaultRootState {
    loginUser: LoginUser;
    messages: MessageBox[];
    searches: { [name: string]: Search<any> };
    plugin: Plugins;
    user: Users;
  }
}
