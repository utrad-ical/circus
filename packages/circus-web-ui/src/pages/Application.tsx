import React, { Fragment, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MessageBox from './MessageBox';
import { Button } from 'components/react-bootstrap';
import ErrorBoundary from 'components/ErrorBoundary';
import MainNav from './MainNav';
import { useDispatch, useSelector } from 'react-redux';
import { useApi } from 'utils/api';
import fetchEventSource from 'utils/fetchEventSource';
import { taskUpdate, taskFinish, taskError } from '../store/taskProgress';

const useTaskProgress = () => {
  const api = useApi();
  const token = api.getToken();
  const dispatch = useDispatch();
  // Listens to the SSE and updates the redux store
  // during the lifecycle of this component.
  useEffect(() => {
    const abortController = new AbortController();
    const load = async () => {
      const generator = fetchEventSource('/api/tasks/report', {
        headers: { Authorization: `Bearer ${token}` },
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
  }, [dispatch, token]);
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
