import { store } from 'store';
import { api } from 'utils/api';
import { browserHistory } from 'react-router';

/*
 * Adds/hides message boxes.
 * By default, message boxes are not closed unless manually dismissed.
 * 'Short' messages are automatically dismissed after 5 seconds.
 */
export function showMessage(
	message,
	style,
	{ tag, short = false } = {}
) {
	const id = Math.random().toString(); // random message id
	store.dispatch({
		type: 'MESSAGE_ADD',
		id,
		tag,
		message,
		style
	});
	if (short) {
		setTimeout(() => dismissMessage(id), 5000);
	}
}

/**
 * Hides the spefied message box.
 */
export function dismissMessage(id) {
	store.dispatch({
		type: 'MESSAGE_DISMISS',
		id
	});
}

/**
 * Loads the user information.
 */
export async function refreshUserInfo(full = false) {
	store.dispatch({ type: 'REQUEST_LOGIN_INFO' });
	try {
		const result = await api('login-info' + (full ? '/full' : ''));
		if (typeof result.userEmail !== 'string') {
			throw Error('Server did not respond with valid user data');
		}
		if (full) {
			store.dispatch({ type: 'LOAD_FULL_LOGIN_INFO', loginUser: result });
		} else {
			store.dispatch({ type: 'CONFIRM_LOGIN_INFO' });
		}
	} catch (err) {
		store.dispatch({ type: 'LOGGED_OUT' });
	}
}

export async function login(id, password) {
	const result = await api('login', {
		data: { id, password },
		handleErrors: true
	});
	browserHistory.push('/home');
}

export async function logout() {
	const result = await api('logout');
	store.dispatch({ type: 'LOGGED_OUT' });
	browserHistory.push('/');
}
