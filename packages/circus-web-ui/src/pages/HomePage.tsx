import React from 'react';
import { Link } from 'react-router-dom';
import {
  Panel,
  Glyphicon,
  Row,
  Col,
  ListGroup,
  ListGroupItem
} from 'components/react-bootstrap';
import ProjectDisplay from 'components/ProjectDisplay';
import Icon from 'components/Icon';
import TimeDisplay from 'components/TimeDisplay';
import styled from 'styled-components';
import useLoginUser from 'utils/useLoginUser';

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
    div.img > span {
      font-size: 200px;
      vertical-align: bottom;
    }
    > a {
      display: block;
      border-radius: 10px;
      background-color: white;
      text-decoration: none;
      font-size: 24px;
      font-weight: bolder;
      padding: 16px 0;
      &:hover {
        color: ${(props: any) => props.theme.highlightColor};
        background-color: #eee;
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
    <Panel bsStyle="primary">
      <Panel.Heading>
        <Glyphicon glyph="education" /> My Projects
      </Panel.Heading>
      <ListGroup>
        {user.accessibleProjects.map(p => (
          <ListGroupItem key={p.project.projectId}>
            <div>
              <ProjectDisplay
                projectId={p.projectId}
                size="lg"
                withName
                withDescription
              />
            </div>
            <small>({p.roles.map(role2str).join(', ')})</small>
          </ListGroupItem>
        ))}
      </ListGroup>
    </Panel>
  );
};

const MyProfile: React.FC<{}> = props => {
  const user = useLoginUser()!;
  return (
    <Panel bsStyle="primary" className="home-profile">
      <Panel.Heading>
        <Glyphicon glyph="user" /> Profile
      </Panel.Heading>
      <ListGroup>
        <ListGroupItem>
          You are logged in as: <b>{user.description}</b>
        </ListGroupItem>
        {user.globalPrivileges.indexOf('manageServer') > -1 ? (
          <ListGroupItem bsStyle="danger">
            <Icon icon="warning-sign" />
            <strong>You have administrative privilege on CIRCUS DB!</strong>
            &ensp; Use this account only when you do administrative tasks.
          </ListGroupItem>
        ) : null}
      </ListGroup>
      <Panel.Body>
        <ul className="list-unstyled">
          <li>
            <b>Login ID:</b> {user.loginId}
          </li>
          <li>
            <b>Email:</b> {user.userEmail}
          </li>
          <li>
            <b>Last login:</b>
            <TimeDisplay value={user.lastLoginTime} /> (from {user.lastLoginIp})
          </li>
          <li>
            <b>Groups:</b> {user.groups.join(', ')}
          </li>
          <li>
            <b>Domains:</b> {user.domains.join(', ')}
          </li>
        </ul>
      </Panel.Body>
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
          <span className={'circus-icon circus-icon-' + icon} />
        </div>
        <p>{title}</p>
      </Link>
      <p>{description}</p>
    </li>
  );
};
