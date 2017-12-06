import { store } from 'store';
import { api, tryAuthenticate } from 'utils/api';
import { browserHistory } from 'react-router';

const dispatch = store.dispatch.bind(store);

/**
 * Loads the user information.
 */
export async function refreshUserInfo(full = false) {
	dispatch({ type: 'REQUEST_LOGIN_INFO' });
	let result;
	try {
		result = await api('login-info' + (full ? '/full' : ''));
		if (typeof result.userEmail !== 'string') {
			throw Error('Server did not respond with valid user data');
		}
	} catch (err) {
		dispatch({ type: 'LOGGED_OUT' });
	}
	if (full) {
		dispatch({ type: 'LOAD_FULL_LOGIN_INFO', loginUser: result });
	} else {
		dispatch({ type: 'CONFIRM_LOGIN_INFO' });
	}
}

export async function login(id, password) {
	await tryAuthenticate(id, password);
	browserHistory.push('/home');
}

export async function logout() {
	await api('logout');
	dispatch({ type: 'LOGGED_OUT' });
	browserHistory.push('/');
}
