import classnames from 'classnames';
import Icon from 'components/Icon';
import NavMenu from 'components/NavMenu';
import TaskNotifier from 'components/TaskNotifier';
import React, { Fragment } from 'react';
import { useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MyList } from 'store/loginUser';
import styled from 'styled-components';
import useLoginUser from 'utils/useLoginUser';

const MainMenu: React.FC<{}> = props => <ul>{props.children}</ul>;

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

const NextPreviousButtons: React.FC<{
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
  const prevLinkDisabled = 0 >= currentPosition;
  const nextLinkDisabled = currentPosition >= props.list.length - 1;
  return (
    <li className="next-previous-buttons">
      <Link
        to={prevLink}
        className={classnames('link-prev', { disabled: prevLinkDisabled })}
      >
        <Icon icon="material-arrow_left_alt" />
        &ensp; Prev
      </Link>
      <Link
        to={nextLink}
        className={classnames('link-next', { disabled: nextLinkDisabled })}
      >
        Next &ensp;
        <Icon icon="material-arrow_right_alt" />
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
      &.icon-menu [class*='navmenu'] {
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
        position: absolute;
        line-height: 35px;
        background-color: rgba(240, 240, 240, 0.9);
        padding: 0;
        border: 1px solid #bbb;
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

  .next-previous-buttons {
    display: flex;
    > a {
      flex: 0 0 50%;
      text-align: center;
      user-select: none;
      &.disabled {
        opacity: 0.5;
        pointer-events: none;
      }
    }
    border-bottom: 1px solid gray;
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
        icon="material-folder_open"
        name="My List"
        link={`/browse/${endPoint}/mylist`}
      />
      {myLists
        .filter(l => l.resourceType === resourceType)
        .map(l => (
          <SubMenu
            key={l.myListId}
            sub
            icon="material-chevron_right"
            name={l.name}
            link={`/browse/${endPoint}/mylist/${l.myListId}`}
          />
        ))}
    </React.Fragment>
  );
};

const MainNav: React.FC<{}> = props => {
  const user = useLoginUser();
  const pathname = useLocation().pathname;
  let nextPreviousList = useSelector(state => state.searches.nextPreviousList);
  const navigate = useNavigate();

  if (!user) return null;
  const loginUserName = user.description;
  const isAdmin = user.globalPrivileges.indexOf('manageServer') > -1;
  const {
    caseSearchPresets = [],
    seriesSearchPresets = [],
    pluginJobSearchPresets = []
  } = user.preferences;
  const myLists = user.myLists ?? [];

  const onLogout = async (ev: React.MouseEvent) => {
    ev.preventDefault();
    navigate('/');
  };

  const currentCase = pathname.split('/').slice(-1)[0];

  if (nextPreviousList.every((list: string) => list !== currentCase)) {
    nextPreviousList = [];
  }

  const showNextPreviousCaseButton =
    pathname.indexOf('/case') === 0 && nextPreviousList.length > 0;
  const showNextPreviousPluginJobButton =
    pathname.indexOf('/plugin-job') === 0 && nextPreviousList.length > 0;

  return (
    <StyledHeader>
      <StyledNav>
        <MainMenu>
          <li className="logo">
            <Link to="/home">
              <span className="circus-icon-logo" />
            </Link>
          </li>
          <NavMenu name="Series" link="/browse/series">
            <SubMenu
              icon="material-search"
              name="Series Search"
              link="/browse/series"
            />
            {seriesSearchPresets.map(preset => (
              <SubMenu
                key={preset.name}
                sub
                icon="material-chevron_right"
                name={preset.name}
                link={`/browse/series/preset/${encodeURIComponent(
                  preset.name
                )}`}
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
          </NavMenu>
          <NavMenu name="Case" link="/browse/case">
            {showNextPreviousCaseButton && (
              <NextPreviousButtons
                list={nextPreviousList}
                current={currentCase}
                prefix="/case"
              />
            )}
            <SubMenu
              icon="material-search"
              name="Case Search"
              link="/browse/case"
            />
            {caseSearchPresets.map(preset => (
              <SubMenu
                key={preset.name}
                sub
                icon="material-chevron_right"
                name={preset.name}
                link={`/browse/case/preset/${encodeURIComponent(preset.name)}`}
              />
            ))}
            <MyListMenuItems
              myLists={myLists}
              resourceType="clinicalCases"
              endPoint="case"
            />
            {/* <SubMenu icon="material-upload_2" name="Case Import" link="/import-case" /> */}
          </NavMenu>
          <NavMenu name="CAD" icon="circus-job" link="/browse/plugin-jobs">
            {showNextPreviousPluginJobButton && (
              <NextPreviousButtons
                list={nextPreviousList}
                current={currentCase}
                prefix="/plugin-job"
              />
            )}
            <SubMenu
              icon="material-search"
              name="Plugin Job Search"
              link="/browse/plugin-jobs"
            />
            {pluginJobSearchPresets.map(preset => (
              <SubMenu
                key={preset.name}
                sub
                icon="material-chevron_right"
                name={preset.name}
                link={`/browse/plugin-jobs/preset/${encodeURIComponent(
                  preset.name
                )}`}
              />
            ))}
            <MyListMenuItems
              myLists={myLists}
              resourceType="pluginJobs"
              endPoint="plugin-jobs"
            />
            <SubMenu
              icon="material-checklist"
              name="Show Job Queue"
              link="/plugin-job-queue"
            />
          </NavMenu>
          <NavMenu name="Tool">
            <li>
              <a
                href="https://circus-project.net/"
                target="_blank"
                rel="noreferrer"
              >
                <Icon icon="material-search" />
                &ensp;Documentation
              </a>
            </li>
            <SubMenu icon="material-lists" name="Task List" link="/task-list" />
            <SubMenu
              icon="circus-preference"
              name="Preference"
              link="/preference"
            />
            <SubMenu
              icon="material-bookmarks"
              name="Access Tokens"
              link="/tokens"
            />
          </NavMenu>
          {isAdmin && (
            <NavMenu name="Administration" link="/admin">
              <SubMenu
                icon="material-grid_view"
                name="Server Configuration"
                link="/admin/general"
              />
              <SubMenu
                icon="material-radio_button_checked"
                name="Groups"
                link="/admin/group"
              />
              <SubMenu icon="material-person" name="Users" link="/admin/user" />
              <MenuHeader>CIRCUS DB</MenuHeader>
              <SubMenu
                icon="material-school"
                name="Projects"
                link="/admin/project"
              />
              <MenuHeader>CIRCUS CS</MenuHeader>
              <SubMenu
                icon="material-list_alt"
                name="Job Manager"
                link="/admin/plugin-job-manager"
              />
              <SubMenu
                icon="circus-app"
                name="CAD Plug-ins"
                link="/admin/plugins"
              />
              <SubMenu
                icon="material-lists"
                name="Job Queue"
                link="/admin/plugin-job-queue"
              />
            </NavMenu>
          )}
        </MainMenu>
      </StyledNav>
      <StyledNav>
        <MainMenu>
          <TaskNotifier />
          <li className="user-info hidden-xs">{loginUserName}</li>
          <NavMenu name="Logout" onClick={onLogout} />
        </MainMenu>
      </StyledNav>
    </StyledHeader>
  );
};

export default MainNav;
