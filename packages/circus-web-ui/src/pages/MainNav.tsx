import React, { Fragment, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from 'components/Icon';
import styled from 'styled-components';
import classnames from 'classnames';
import { useLoginManager } from 'utils/loginManager';
import browserHistory from '../browserHistory';
import useLoginUser from 'utils/useLoginUser';
import TaskNotifier from 'components/TaskNotifier';
import { MyList } from 'store/loginUser';
import { Button } from 'components/react-bootstrap';
import { useSelector } from 'react-redux';

const MainMenu: React.FC<{}> = props => <ul>{props.children}</ul>;

const Menu: React.FC<{
  name: string;
  icon?: string;
  link?: string;
  onClick?: () => void;
}> = props => {
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

const NextPreviousButton: React.FC<{
  list: string[];
  current: string;
  prefix: string;
}> = props => {
  const currentPosition = props.list.indexOf(props.current);
  if (currentPosition < 0) {
    return null;
  }
  const prevLink = `${props.prefix}/${props.list[currentPosition - 1]}`;
  const nextLink = `${props.prefix}/${props.list[currentPosition + 1]}`;
  const ablePrevLink = 0 < currentPosition;
  const ableNextLink = currentPosition < props.list.length - 1;
  return (
    <div className="next-previous-button">
      <Link to={prevLink} className="link-prev">
        <Button disabled={!ablePrevLink}>
          <Icon icon="arrow-left" />
          &ensp; Prev
        </Button>
      </Link>
      <Link to={nextLink} className="link-next">
        <Button disabled={!ableNextLink}>
          Next &ensp;
          <Icon icon="arrow-right" />
        </Button>
      </Link>
    </div>
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
        &.pull-left {
          right: 0;
          left: auto;
        }
        > li {
          display: block;
          min-width: 200px;
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
              padding: 2px 0 2px 20px;
              line-height: 25px;
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

  .next-previous-button {
    [class^='link-'] {
      width: 50%;
      button {
        width: 100%;
      }
    }
  }
`;

const MyListMenuItems: React.FC<{
  myLists: MyList[];
  resourceType: string;
  endPoint: string;
}> = props => {
  const { myLists, resourceType, endPoint } = props;
  return (
    <React.Fragment>
      <SubMenu
        icon="glyphicon-folder-open"
        name="My List"
        link={`/browse/${endPoint}/mylist`}
      />
      {myLists
        .filter(l => l.resourceType === resourceType)
        .map(l => (
          <SubMenu
            key={l.myListId}
            sub
            icon="chevron-right"
            name={l.name}
            link={`/browse/${endPoint}/mylist/${l.myListId}`}
          />
        ))}
    </React.Fragment>
  );
};

const MainNav: React.FC<{}> = props => {
  const user = useLoginUser();
  const loginManager = useLoginManager();
  const pathname = useLocation().pathname;
  const searchedCaseResult = useSelector(
    state => state.searches.searches['case']
  );
  const searchedPluginJobResult = useSelector(
    state => state.searches.searches['pluginJob']
  );

  if (!user) return null;

  const loginUserName = user.description;
  const isAdmin = user.globalPrivileges.indexOf('manageServer') > -1;
  const {
    caseSearchPresets = [],
    seriesSearchPresets = [],
    pluginJobSearchPresets = []
  } = user.preferences;
  const myLists = user.myLists ?? [];

  const onLogout = async () => {
    await loginManager.logout();
    browserHistory.push('/');
  };

  const dispNextPreviousCaseButton =
    pathname.indexOf('/case') === 0 &&
    Object(searchedCaseResult) === searchedCaseResult &&
    'results' in searchedCaseResult;
  const dispNextPreviousPluginJobButton =
    pathname.indexOf('/plugin-job') === 0 &&
    Object(searchedPluginJobResult) === searchedPluginJobResult &&
    'results' in searchedPluginJobResult;

  const currentCase = pathname.split('/').slice(-1)[0];

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
            <MyListMenuItems
              myLists={myLists}
              resourceType="series"
              endPoint="series"
            />
            <SubMenu
              icon="circus-series-import"
              name="Series Import"
              link="/import-series"
            />
          </Menu>
          <Menu name="Case" link="/browse/case">
            {dispNextPreviousCaseButton && (
              <NextPreviousButton
                list={
                  searchedCaseResult.results
                    ? searchedCaseResult.results.indexes
                    : []
                }
                current={currentCase}
                prefix="/case"
              />
            )}
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
            <MyListMenuItems
              myLists={myLists}
              resourceType="clinicalCases"
              endPoint="case"
            />
            {/* <SubMenu icon="open" name="Case Import" link="/import-case" /> */}
          </Menu>
          <Menu name="CAD" icon="circus-icon-job" link="/browse/plugin-jobs">
            {dispNextPreviousPluginJobButton && (
              <NextPreviousButton
                list={
                  searchedPluginJobResult.results
                    ? searchedPluginJobResult.results.indexes
                    : []
                }
                current={currentCase}
                prefix="/plugin-job"
              />
            )}
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
            <MyListMenuItems
              myLists={myLists}
              resourceType="pluginJobs"
              endPoint="plugin-jobs"
            />
            <SubMenu
              icon="tasks"
              name="Show Job Queue"
              link="/plugin-job-queue"
            />
          </Menu>
          <Menu name="Tool">
            <li>
              <a href="https://circus-project.net/" target="_blank">
                <Icon icon="search" />
                &ensp;Documentation
              </a>
            </li>
            <SubMenu icon="tasks" name="Task List" link="/task-list" />
            <SubMenu
              icon="circus-preference"
              name="Preference"
              link="/preference"
            />
            <SubMenu icon="bookmark" name="Access Tokens" link="/tokens" />
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
          <TaskNotifier />
          <li className="user-info hidden-xs">{loginUserName}</li>
          <Menu name="Logout" onClick={onLogout} />
        </MainMenu>
      </StyledNav>
    </StyledHeader>
  );
};

export default MainNav;
