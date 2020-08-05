import React, { Fragment } from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/Icon';
import styled from 'styled-components';
import classnames from 'classnames';
import { useLoginManager } from 'utils/loginManager';
import browserHistory from 'browserHistory';
import useLoginUser from 'utils/useLoginUser';

const MainMenu: React.FC<{}> = props => <ul>{props.children}</ul>;

const Menu: React.FC<any> = props => {
  const { name, icon, link, onClick, children } = props;
  const className = icon ? icon : `circus-icon-${name.toLowerCase()}`;
  const caption = [
    <span className={className} key="icon" />,
    <span className="hidden-xs" key="caption">
      {name}
    </span>
  ];
  return (
    <li className="icon-menu" key={name}>
      {link ? (
        <Link to={link}>{caption}</Link>
      ) : onClick ? (
        <a onClick={onClick} href="#">
          {caption}
        </a>
      ) : (
        caption
      )}
      <ul>{children}</ul>
    </li>
  );
};

const SubMenu: React.FC<{
  link: string;
  icon: string;
  name: string;
  sub?: boolean;
}> = props => {
  return (
    <li className={classnames({ sub: props.sub })}>
      <Link to={props.link}>
        {props.icon && (
          <Fragment>
            <Icon icon={props.icon} />
            &ensp;
          </Fragment>
        )}
        {props.name}
      </Link>
    </li>
  );
};

const MenuHeader: React.FC<{}> = props => {
  return (
    <li>
      <div className="menu-header">{props.children}</div>
    </li>
  );
};

const StyledHeader = styled.header`
  margin: 0 auto;
  width: 100%;
  flex: none;
  position: relative;
  background-color: ${(props: any) => props.theme.brandDark};
  border-bottom: 1px solid ${(props: any) => props.theme.brandDarker};
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
  }

  > ul {
    /* main navigation menu */
    margin: 0;
    padding: 0 5px;
    > li {
      /* main navigation item */
      padding: 0 5px;
      display: inline-block;
      position: relative;
      &.icon-menu span[class^='circus-icon'] {
        font-size: 25px;
        vertical-align: middle;
        margin-right: 3px;
      }
      > a {
        color: white;
        text-decoration: none;
      }
      &.logo,
      &.icon-menu {
        &:hover {
          color: ${(props: any) => props.theme.highlightColor};
          background-color: ${(props: any) => props.theme.brandPrimary};
          > a {
            color: inherit;
            text-decoration: none;
          }
          > ul {
            /* show dropdown sub menu */
            display: block;
          }
        }
      }
      > ul {
        /* dropdown sub menu */
        display: none; /* initially hidden */
        position: absolute;
        top: 39px;
        left: 0;
        line-height: 35px;
        background-color: rgba(240, 240, 240, 0.9);
        padding: 0;
        border: 1px solid #bbb;
        > li {
          display: block;
          width: 200px;
          color: black;
          a {
            text-decoration: none;
            display: block;
            padding: 0 8px;
            color: inherit;
            &:hover {
              background-color: ${(props: any) => props.theme.brandPrimary};
              color: white;
            }
          }
          .menu-header {
            border-top: 1px solid #bbbbbb;
            line-height: 20px;
            padding: 5px 8px 0 8px;
            color: gray;
          }
          &.sub {
            /* sub-sub menu indent */
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

const MainNav: React.FC<{}> = props => {
  const user = useLoginUser();
  const loginManager = useLoginManager();

  if (!user) return null;

  const loginUserName = user.description;
  const isAdmin = user.globalPrivileges.indexOf('manageServer') > -1;
  const caseSearchPresets = user.preferences?.caseSearchPresets ?? [];
  const seriesSearchPresets = user.preferences?.seriesSearchPresets ?? [];
  const pluginJobSearchPresets = user.preferences?.pluginJobSearchPresets ?? [];

  const onLogout = async () => {
    await loginManager.logout();
    browserHistory.push('/');
  };

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
          <Menu name="CAD" icon="circus-icon-job" link="/browse/plugin-jobs">
            <SubMenu
              icon="search"
              name="Plugin Job Search"
              link="/browse/plugin-jobs"
            />
            {pluginJobSearchPresets.map(preset => (
              <SubMenu
                key={preset.name}
                sub
                icon="chevron-right"
                name={preset.name}
                link={`/browse/plugin-jobs/${encodeURIComponent(preset.name)}`}
              />
            ))}
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
          {isAdmin && (
            <Menu name="Administration" link="/admin">
              <SubMenu
                icon="th-large"
                name="Server Configuration"
                link="/admin/general"
              />
              <SubMenu icon="record" name="Groups" link="/admin/group" />
              <SubMenu icon="user" name="Users" link="/admin/user" />
              <MenuHeader>CIRCUS DB</MenuHeader>
              <SubMenu icon="education" name="Projects" link="/admin/project" />
              <MenuHeader>CIRCUS CS</MenuHeader>
              <SubMenu
                icon="list-alt"
                name="Job Manager"
                link="/admin/plugin-job-manager"
              />
              <SubMenu
                icon="circus-app"
                name="CAD Plug-ins"
                link="/admin/plugins"
              />
              <SubMenu
                icon="list"
                name="Job Queue"
                link="/admin/plugin-job-queue"
              />
            </Menu>
          )}
        </MainMenu>
      </StyledNav>
      <StyledNav>
        <MainMenu>
          <li className="user-info hidden-xs">{loginUserName}</li>
          <Menu name="Logout" onClick={onLogout} />
        </MainMenu>
      </StyledNav>
    </StyledHeader>
  );
};

export default MainNav;
