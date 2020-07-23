import { LoginUser, Search, Plugins, Users } from 'store';
import { MessageBox } from 'store/message-box';

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
