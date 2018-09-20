import React, { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import MessageBox from './MessageBox';
import { Button } from 'components/react-bootstrap';
import { logout } from 'actions';
import Icon from 'components/Icon';
import styled from 'styled-components';
import classnames from 'classnames';

/**
 * The main application container.
 * The navigation bar is always visible, but the main page content is
 * visible only after we confirmed the user is currently logged-in with valid session.
 */
const ApplicationView = props => {
  const pageContentVisible = !props.isUserFetching && props.isLoggedIn;
  const notLoggedIn = !props.isUserFetching && !props.isLoggedIn;

  const containerClass = 'container';
  return (
    <div>
      <Nav />
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
      <div className={containerClass}>
        {pageContentVisible && props.children}
      </div>
    </div>
  );
};

const Application = connect(state => ({
  isUserFetching: state.loginUser.isFetching,
  isLoggedIn: state.loginUser.data !== null
}))(ApplicationView);

export default Application;

const StyledHeader = styled.header`
  margin: 0 auto;
  position: relative;
  background-color: ${props => props.theme.brandDark};
  border-bottom: 1px solid ${props => props.theme.brandDarker};
  line-height: 39px;
  z-index: 2000;
  color: white;
  text-align: left;

  display: flex;
  flex-flow: row;
  justify-content: space-between;
`;

const StyledNav = styled.nav`
  a {
    display: inline-block;
    color: inherit !important;
    text-decoration: none !important;
  }

  > ul {
    // main navigation menu
    margin: 0;
    padding: 0 5px;
    > li {
      // main navigation item
      padding: 0 5px;
      display: inline-block;
      position: relative;
      &.icon-menu span[class^='circus-icon'] {
        font-size: 25px;
        vertical-align: middle;
        margin-right: 3px;
      }
      &.logo:hover,
      &.icon-menu:hover {
        color: ${props => props.theme.highlightColor};
        background-color: ${props => props.theme.brandPrimary};
        > ul {
          // show dropdown sub menu
          display: block;
        }
      }
      > ul {
        // dropdown sub menu
        display: none;
        position: absolute;
        top: 39px;
        left: 0;
        background-color: rgba(240, 240, 240, 0.9);
        padding: 0;
        border: 1px solid #bbb;
        > li {
          display: block;
          width: 200px;
          border-bottom: 1px solid #bbb;
          color: black;
          &:hover {
            background-color: ${props => props.theme.brandPrimary};
            color: white;
          }
          a {
            display: block;
            height: 40px;
            line-height: 40px;
            padding: 0 8px;
          }
          &.sub {
            // sub-sub menu indent
            a {
              padding-left: 20px;
              height: 30px;
              line-height: 30px;
            }
          }
        }
      }
    }
  }

  .logo {
    text-shadow: 1px 1px 2px black;
  }

  .user-info {
    font-weight: bold;
    margin-right: 10px;
  }
`;

const NavView = props => {
  const { onLogout, caseSearchPresets, seriesSearchPresets } = props;
  return (
    <StyledHeader>
      <StyledNav>
        <MainMenu>
          <li className="logo">
            <Link to="/home">
              <span className="circus-icon-logo" />
            </Link>
          </li>
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
          <Menu name="CAD" link="/browse/plugin-jobs">
            <SubMenu
              icon="search"
              name="Plugin Job Search"
              link="/browse/plugin-jobs"
            />
            <SubMenu
              icon="tasks"
              name="Show Job Queue"
              link="/plugin-job-queue"
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
      </StyledNav>
      <StyledNav>
        <MainMenu>
          <li className="user-info hidden-xs">{props.loginUserName}</li>
          <Menu name="Logout" onClick={onLogout} />
        </MainMenu>
      </StyledNav>
    </StyledHeader>
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
