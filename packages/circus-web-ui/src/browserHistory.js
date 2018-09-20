// https://github.com/ReactTraining/react-router/blob/master/FAQ.md#how-do-i-access-the-history-object-outside-of-components

import createBrowserHistory from 'history/createBrowserHistory';

const history = createBrowserHistory();
export default history;
