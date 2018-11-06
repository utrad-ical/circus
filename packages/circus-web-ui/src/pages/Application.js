import React, { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import MessageBox from './MessageBox';
import { Button } from 'components/react-bootstrap';
import ErrorBoundary from 'components/ErrorBoundary';
import MainNav from './MainNav';

/**
 * The main application container.
 * The navigation bar is always visible, but the main page content is
 * visible only after we confirmed the user is currently logged-in with valid session.
 */
const ApplicationView = props => {
  const pageContentVisible = !props.isUserFetching && props.isLoggedIn;
  const notLoggedIn = !props.isUserFetching && !props.isLoggedIn;

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

const Application = connect(state => ({
  isUserFetching: state.loginUser.isFetching,
  isLoggedIn: state.loginUser.data !== null
}))(ApplicationView);

export default Application;
