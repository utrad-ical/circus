import React, { Fragment } from 'react';
import { Link } from 'react-router-dom';
import MessageBox from './MessageBox';
import { Button } from 'components/react-bootstrap';
import ErrorBoundary from 'components/ErrorBoundary';
import MainNav from './MainNav';
import { useMappedState } from 'redux-react-hook';

const mapState = state => ({
  isUserFetching: state.loginUser.isFetching,
  isLoggedIn: state.loginUser.data !== null
});

/**
 * The main application container.
 * The navigation bar is always visible, but the main page content is
 * visible only after we confirmed the user is currently logged-in with valid session.
 */
const Application = props => {
  const { isUserFetching, isLoggedIn } = useMappedState(mapState);

  const pageContentVisible = !isUserFetching && isLoggedIn;
  const notLoggedIn = !isUserFetching && !isLoggedIn;

  return (
    <Fragment>
      <MainNav />
      <ErrorBoundary>
        <div className="full-container">
          <MessageBox />
          {notLoggedIn && (
            <div className="alert alert-danger">
              You are not logged in, or your session has been expired.<br />
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
