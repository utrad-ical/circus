import { store } from '#store/index.ts';
import { showMessage } from '#store/messages.ts';

/**
 * The session cookie is shared by all tabs of the browser, so logging in as
 * another user (or logging out) in one tab changes the user of all the tabs.
 * Other tabs notice it either by a broadcast from that tab or by an error
 * from the API server, and ask the user to reload the page.
 */

/** Sent with API requests; the server rejects them if the user differs */
export const expectedUserHeaderName = 'X-Circus-User';

const sessionUserChangedHeaderName = 'x-circus-session-user-changed';

/** Returns the user this tab believes it is logged in as */
export const currentUserEmail = (): string | undefined =>
  store.getState().loginUser.data?.userEmail;

export const isSessionUserChangedError = (err: any) =>
  err?.response?.status === 409 &&
  !!err.response.headers?.[sessionUserChangedHeaderName];

export const showSessionUserChangedMessage = () => {
  store.dispatch(
    showMessage(
      'The login user of this browser has changed in another tab or window. ' +
        'Please reload this page.',
      'danger',
      { tag: 'sessionUserChanged', dismissOnPageChange: false }
    )
  );
};

const channel =
  typeof BroadcastChannel === 'function'
    ? new BroadcastChannel('circus-session')
    : undefined;

type SessionMessage = { userEmail: string | null };

/**
 * Tells other tabs that this tab has logged in or out.
 */
export const broadcastSessionChange = (userEmail: string | null) => {
  channel?.postMessage({ userEmail } satisfies SessionMessage);
};

channel?.addEventListener('message', (event: MessageEvent<SessionMessage>) => {
  const current = currentUserEmail();
  // Tabs not logged in (e.g., the login screen) have nothing to lose
  if (!current) return;
  if (event.data.userEmail !== current) showSessionUserChangedMessage();
});
