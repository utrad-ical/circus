import classnames from 'classnames';
import Icon from '#components/Icon.tsx';
import NavMenu, { NavMenuHeader, NavSubMenu } from '#components/NavMenu.tsx';
import TaskNotifier from '#components/TaskNotifier.tsx';
import React, { type FC, type MouseEvent } from 'react';
import { useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { MyList } from '#store/loginUser.ts';
import useLoginUser from '#utils/useLoginUser.ts';
import styles from './MainNav.module.css';

const NextPreviousButtons: FC<{
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
    <li className={styles.nextPrevious}>
      <Link
        to={prevLink}
        className={classnames({ [styles.disabled]: prevLinkDisabled })}
      >
        <Icon icon="material-arrow_left_alt" />
        &ensp; Prev
      </Link>
      <Link
        to={nextLink}
        className={classnames({ [styles.disabled]: nextLinkDisabled })}
      >
        Next &ensp;
        <Icon icon="material-arrow_right_alt" />
      </Link>
    </li>
  );
};

const MyListMenuItems: FC<{
  myLists: MyList[];
  resourceType: string;
  endPoint: string;
}> = props => {
  const { myLists, resourceType, endPoint } = props;
  return (
    <>
      <NavSubMenu
        icon="material-folder_open"
        name="My List"
        link={`/browse/${endPoint}/mylist`}
      />
      {myLists
        .filter(l => l.resourceType === resourceType)
        .map(l => (
          <NavSubMenu
            key={l.myListId}
            nested
            icon="material-chevron_right"
            name={l.name}
            link={`/browse/${endPoint}/mylist/${l.myListId}`}
          />
        ))}
    </>
  );
};

const MainNav: FC<{}> = props => {
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

  const onLogout = async (ev: MouseEvent) => {
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
    <header className={styles.header}>
      <nav>
        <ul className={styles.menu}>
          <li className={styles.logo}>
            <Link to="/home">
              <Icon icon="circus-logo" />
            </Link>
          </li>
          <NavMenu name="Series" link="/browse/series">
            <NavSubMenu
              icon="material-search"
              name="Series Search"
              link="/browse/series"
            />
            {seriesSearchPresets.map(preset => (
              <NavSubMenu
                key={preset.name}
                nested
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
            <NavSubMenu
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
            <NavSubMenu
              icon="material-search"
              name="Case Search"
              link="/browse/case"
            />
            {caseSearchPresets.map(preset => (
              <NavSubMenu
                key={preset.name}
                nested
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
            {/* <NavSubMenu icon="material-upload_2" name="Case Import" link="/import-case" /> */}
          </NavMenu>
          <NavMenu name="CAD" icon="circus-job" link="/browse/plugin-jobs">
            {showNextPreviousPluginJobButton && (
              <NextPreviousButtons
                list={nextPreviousList}
                current={currentCase}
                prefix="/plugin-job"
              />
            )}
            <NavSubMenu
              icon="material-search"
              name="Plugin Job Search"
              link="/browse/plugin-jobs"
            />
            {pluginJobSearchPresets.map(preset => (
              <NavSubMenu
                key={preset.name}
                nested
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
            <NavSubMenu
              icon="material-checklist"
              name="Show Job Queue"
              link="/plugin-job-queue"
            />
          </NavMenu>
          <NavMenu name="Tool">
            <NavSubMenu
              icon="material-search"
              name="Documentation"
              link="https://circus-project.net/"
              external
            />
            <NavSubMenu
              icon="material-lists"
              name="Task List"
              link="/task-list"
            />
            <NavSubMenu
              icon="circus-preference"
              name="Preference"
              link="/preference"
            />
            <NavSubMenu
              icon="material-bookmarks"
              name="Access Tokens"
              link="/tokens"
            />
          </NavMenu>
          {isAdmin && (
            <NavMenu name="Administration" link="/admin">
              <NavSubMenu
                icon="material-grid_view"
                name="Server Configuration"
                link="/admin/general"
              />
              <NavSubMenu
                icon="material-groups"
                name="Groups"
                link="/admin/group"
              />
              <NavSubMenu
                icon="material-person"
                name="Users"
                link="/admin/user"
              />
              <NavMenuHeader>CIRCUS DB</NavMenuHeader>
              <NavSubMenu
                icon="material-school"
                name="Projects"
                link="/admin/project"
              />
              <NavMenuHeader>CIRCUS CS</NavMenuHeader>
              <NavSubMenu
                icon="material-list_alt"
                name="Job Manager"
                link="/admin/plugin-job-manager"
              />
              <NavSubMenu
                icon="circus-app"
                name="CAD Plug-ins"
                link="/admin/plugins"
              />
              <NavSubMenu
                icon="material-pending_actions"
                name="Job Queue"
                link="/admin/plugin-job-queue"
              />
            </NavMenu>
          )}
        </ul>
      </nav>
      <nav>
        <ul className={styles.menu}>
          <TaskNotifier />
          <li className={styles.userInfo}>{loginUserName}</li>
          <NavMenu name="Logout" onClick={onLogout} />
        </ul>
      </nav>
    </header>
  );
};

export default MainNav;
