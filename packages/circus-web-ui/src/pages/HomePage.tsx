import Panel, {
  PanelHeader,
  PanelBody,
  PanelList,
  PanelListItem
} from '#components/Panel.tsx';
import React from 'react';
import { Link } from 'react-router-dom';
import { Row, Col } from '#components/react-bootstrap.ts';
import ProjectDisplay from '#components/ProjectDisplay.tsx';
import Icon from '#components/Icon.tsx';
import TimeDisplay from '#components/TimeDisplay.tsx';
import styled from 'styled-components';
import useLoginUser from '#utils/useLoginUser.ts';

const HomeMenu = styled.ul`
  margin: 20px 0;
  padding: 0;
  word-break: normal;
  display: flex;
  flex-flow: row wrap;
  justify-content: space-around;
  align-items: flex-start;
  > li {
    display: block;
    text-align: center;
    width: 250px;
    div.img > svg {
      font-size: 200px;
      vertical-align: bottom;
    }
    > a {
      display: block;
      border-radius: 10px;
      background-color: var(--circus-background);
      text-decoration: none;
      font-size: 24px;
      font-weight: bolder;
      padding: 16px 0;
      color: var(--circus-brand-primary);
      &:hover {
        color: var(--circus-highlight-color);
        background-color: var(--circus-secondary-background);
      }
    }
  }
`;

const HomePage: React.FC<{}> = props => (
  <div>
    <h1>Welcome to CIRCUS!</h1>
    <HomeMenu>
      <Menu
        link="/import-series"
        icon="series-import"
        title="Series Import"
        description="Upload DICOM image files directly via the browser."
      />
      <Menu
        link="/browse/series"
        icon="series-search"
        title="Series Search"
        description="Search and edit existing cases."
      />
      <Menu
        link="/browse/case"
        icon="case-search"
        title="Case Search"
        description="Search and edit existing cases."
      />
      <Menu
        link="/browse/plugin-jobs"
        icon="job-search"
        title="Plug-in Job Search"
        description="Search and view CAD results."
      />
    </HomeMenu>
    <Profile />
  </div>
);
export default HomePage;

const role2str = (role: string) => {
  return role
    .replace(/Groups$/, '')
    .replace(/([A-Z])/g, (m, s) => ' ' + s.toLowerCase());
};

const MyProjects: React.FC<{}> = props => {
  const user = useLoginUser()!;
  return (
    <Panel variant="primary">
      <PanelHeader>
        <Icon icon="material-school" /> My Projects
      </PanelHeader>
      <PanelList>
        {user.accessibleProjects.map(p => (
          <PanelListItem key={p.project.projectId}>
            <div>
              <ProjectDisplay
                projectId={p.projectId}
                size="lg"
                withName
                withDescription
              />
            </div>
            <small>({p.roles.map(role2str).join(', ')})</small>
          </PanelListItem>
        ))}
      </PanelList>
    </Panel>
  );
};

const MyProfile: React.FC<{}> = props => {
  const user = useLoginUser()!;
  return (
    <Panel variant="primary">
      <PanelHeader>
        <Icon icon="material-person" /> Profile
      </PanelHeader>
      <PanelList>
        <PanelListItem>
          You are logged in as: <b>{user.description}</b>
        </PanelListItem>
        {user.globalPrivileges.indexOf('manageServer') > -1 ? (
          <PanelListItem variant="danger">
            <Icon icon="material-warning" />
            <strong>You have administrative privilege on CIRCUS DB!</strong>
            &ensp; Use this account only when you do administrative tasks.
          </PanelListItem>
        ) : null}
      </PanelList>
      <PanelBody>
        <ul className="list-unstyled">
          <li>
            <b>Login ID:</b> {user.loginId}
          </li>
          <li>
            <b>Email:</b> {user.userEmail}
          </li>
          <li>
            <b>Last login:</b> <TimeDisplay value={user.lastLoginTime} /> (from{' '}
            {user.lastLoginIp})
          </li>
          <li>
            <b>Groups:</b> {user.groups.join(', ')}
          </li>
          <li>
            <b>Domains:</b> {user.domains.join(', ')}
          </li>
        </ul>
      </PanelBody>
    </Panel>
  );
};

const Profile: React.FC<{}> = props => {
  return (
    <Row>
      <Col md={7}>
        <MyProjects />
      </Col>
      <Col md={5}>
        <MyProfile />
      </Col>
    </Row>
  );
};

const Menu: React.FC<{
  link: string;
  icon: string;
  title: string;
  description: string;
}> = props => {
  const { link, icon, title, description } = props;
  return (
    <li>
      <Link to={link}>
        <div className="img">
          <Icon icon={`circus-${icon}`} />
        </div>
        <p>{title}</p>
      </Link>
      <p>{description}</p>
    </li>
  );
};
