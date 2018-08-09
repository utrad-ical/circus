import React, { Fragment } from 'react';
import { Link } from 'react-router';
import { connect } from 'react-redux';
import MessageBox from './MessageBox';
import { Button } from 'shared/components/react-bootstrap';
import { logout } from 'shared/actions';
import Icon from 'shared/components/Icon';
import classnames from 'classnames';

/**
 * The main application container.
 * The navigation bar is always visible, but the main page content is
 * visible only after we confirmed the user is currently logged-in with valid session.
 */
const ApplicationView = props => {
  const pageContentVisible = !props.isUserFetching && props.isLoggedIn;
  const notLoggedIn = !props.isUserFetching && !props.isLoggedIn;

  const full = props.routes.some(
    r =>
      r.component &&
      r.component.displayName &&
      r.component.displayName.match(/CaseDetail/)
  );
  const containerClass = full ? 'full-container' : 'container';
  return (
    <div>
      <Nav />
      <div className={containerClass}>
        <MessageBox />
        {pageContentVisible && props.children}
        {notLoggedIn ? (
          <div className="alert alert-danger">
            You are not logged in, or your session has been expired.<br />
            Please log in first.
            <div>
              <Link to="/">
                <Button>Login</Button>
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const Application = connect(state => ({
  isUserFetching: state.loginUser.isFetching,
  isLoggedIn: state.loginUser.data !== null
}))(ApplicationView);

export default Application;

const NavView = props => {
  const { onLogout, caseSearchPresets, seriesSearchPresets } = props;
  return (
    <header>
      <nav>
        <MainMenu>
          <li className="logo">
            <Link to="/home">
              <span className="circus-icon-logo" />
            </Link>
          </li>
          <Menu name="Case" link="/browse/case">
            <SubMenu icon="search" name="Case Search" link="/browse/case" />
            {caseSearchPresets.map(preset => (
              <SubMenu
                key={preset.name}
                sub
                icon="chevron-right"
                name={preset.name}
                link={`/browse/case/${encodeURIComponent(preset.name)}`}
              />
            ))}
            <SubMenu icon="open" name="Case Import" link="/import-case" />
          </Menu>
          <Menu name="Series" link="/browse/series">
            <SubMenu icon="search" name="Series Search" link="/browse/series" />
            {seriesSearchPresets.map(preset => (
              <SubMenu
                key={preset.name}
                sub
                icon="chevron-right"
                name={preset.name}
                link={`/browse/series/${encodeURIComponent(preset.name)}`}
              />
            ))}
            <SubMenu
              icon="circus-series-import"
              name="Series Import"
              link="/import-series"
            />
          </Menu>
          <Menu name="Tool">
            <SubMenu icon="tasks" name="Task List" link="/task-list" />
            <SubMenu
              icon="circus-preference"
              name="Preference"
              link="/preference"
            />
          </Menu>
          {props.isAdmin && (
            <Menu name="Administration" link="/admin">
              <SubMenu
                icon="th-large"
                name="Server Configuration"
                link="/admin/general"
              />
              <SubMenu icon="education" name="Project" link="/admin/project" />
              <SubMenu icon="record" name="Groups" link="/admin/group" />
              <SubMenu icon="user" name="Users" link="/admin/user" />
            </Menu>
          )}
        </MainMenu>
      </nav>
      <nav>
        <MainMenu>
          <li className="user-info hidden-xs">{props.loginUserName}</li>
          <Menu name="Logout" onClick={onLogout} />
        </MainMenu>
      </nav>
    </header>
  );
};

const Nav = connect(
  state => ({
    loginUserName: state.loginUser.data ? state.loginUser.data.description : '',
    isAdmin:
      state.loginUser.data &&
      state.loginUser.data.globalPrivileges.indexOf('manageServer') > -1,
    caseSearchPresets: state.loginUser.data
      ? state.loginUser.data.preferences.caseSearchPresets
      : [],
    seriesSearchPresets: state.loginUser.data
      ? state.loginUser.data.preferences.seriesSearchPresets
      : []
  }),
  dispatch => ({
    onLogout: () => dispatch(logout())
  })
)(NavView);

const MainMenu = props => <ul>{props.children}</ul>;

const Menu = props => {
  const className = `circus-icon-${props.name.toLowerCase()}`;
  const caption = [
    <span className={className} key="icon" />,
    <span className="hidden-xs" key="caption">
      {props.name}
    </span>
  ];
  return (
    <li className="icon-menu" key={props.name} onClick={props.onClick}>
      {props.link ? <Link to={props.link}>{caption}</Link> : caption}
      <ul>{props.children}</ul>
    </li>
  );
};

const SubMenu = props => {
  return (
    <li className={classnames({ sub: props.sub })}>
      <Link to={props.link}>
        {props.icon && (
          <Fragment>
            <Icon icon={props.icon} />&ensp;
          </Fragment>
        )}
        {props.name}
      </Link>
    </li>
  );
};
