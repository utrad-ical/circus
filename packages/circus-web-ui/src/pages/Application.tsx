import React, { Fragment, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MessageBox from './MessageBox.tsx';
import { Button } from '#components/react-bootstrap.ts';
import ErrorBoundary from '#components/ErrorBoundary.tsx';
import MainNav from './MainNav.tsx';
import { useDispatch, useSelector } from 'react-redux';
import useLoginUser from '#utils/useLoginUser.ts';
import fetchEventSource from '#utils/fetchEventSource.ts';
import { taskUpdate, taskFinish, taskError } from '../store/taskProgress.ts';

const useTaskProgress = () => {
  const dispatch = useDispatch();
  const userEmail = useLoginUser()?.userEmail;
  // Listens to the SSE and updates the redux store
  // during the lifecycle of this component.
  // The request is authenticated with the session cookie.
  useEffect(() => {
    const abortController = new AbortController();
    const load = async () => {
      if (!userEmail) return;
      const generator = fetchEventSource('/api/tasks/report', {
        signal: abortController.signal
      });
      for await (const event of generator) {
        switch (event.type) {
          case 'progress':
            dispatch(
              taskUpdate({
                taskId: event.taskId,
                updates: {
                  finished: event.finished,
                  total: event.total,
                  message: event.message
                }
              })
            );
            break;
          case 'finish':
            dispatch(
              taskFinish({ taskId: event.taskId, message: event.message })
            );
            break;
          case 'error':
            dispatch(
              taskError({ taskId: event.taskId, message: event.message })
            );
            break;
        }
      }
    };
    load();
    return () => {
      abortController.abort();
    };
  }, [dispatch, userEmail]);
};

/**
 * The main application container.
 * The navigation bar is always visible, but the main page content is
 * visible only after we confirmed the user is currently logged-in with valid session.
 */
const Application: React.FC<{}> = props => {
  const isUserFetching = useSelector(state => state.loginUser.isFetching);
  const isLoggedIn = useSelector(state => state.loginUser.data !== null);

  const pageContentVisible = !isUserFetching && isLoggedIn;
  const notLoggedIn = !isUserFetching && !isLoggedIn;

  // Listens to the task progress reporter while the application is active
  useTaskProgress();

  return (
    <Fragment>
      <MainNav />
      <ErrorBoundary>
        <div className="full-container">
          <MessageBox />
          {notLoggedIn && (
            <div className="alert alert-danger">
              You are not logged in, or your session has been expired.
              <br />
              Please log in first.
              <div>
                <Link to="/">
                  <Button>Login</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
        <div className="container">{pageContentVisible && props.children}</div>
      </ErrorBoundary>
    </Fragment>
  );
};

export default Application;
