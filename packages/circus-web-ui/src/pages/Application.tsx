import Alert from '#components/Alert.tsx';
import Button from '#components/Button.tsx';
import React, { Fragment } from 'react';
import { Link } from 'react-router-dom';
import MessageBox from './MessageBox.tsx';
import ErrorBoundary from '#components/ErrorBoundary.tsx';
import MainNav from './MainNav.tsx';
import { useAppSelector } from '#store/index.ts';

/**
 * The main application container.
 * The navigation bar is always visible, but the main page content is
 * visible only after we confirmed the user is currently logged-in with valid session.
 */
const Application: React.FC<{ children?: React.ReactNode }> = props => {
  const isUserFetching = useAppSelector(state => state.loginUser.isFetching);
  const isLoggedIn = useAppSelector(state => state.loginUser.data !== null);

  const pageContentVisible = !isUserFetching && isLoggedIn;
  const notLoggedIn = !isUserFetching && !isLoggedIn;

  return (
    <Fragment>
      <MainNav />
      <ErrorBoundary>
        <div className="full-container">
          <MessageBox />
          {notLoggedIn && (
            <Alert variant="danger">
              You are not logged in, or your session has been expired.
              <br />
              Please log in first.
              <div>
                <Link to="/">
                  <Button>Login</Button>
                </Link>
              </div>
            </Alert>
          )}
        </div>
        <div className="page-container">
          {pageContentVisible && props.children}
        </div>
      </ErrorBoundary>
    </Fragment>
  );
};

export default Application;
