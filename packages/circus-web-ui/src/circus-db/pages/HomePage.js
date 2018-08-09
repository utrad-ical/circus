import React from 'react';
import { Link } from 'react-router';
import { connect } from 'react-redux';
import {
  Panel,
  Glyphicon,
  Row,
  Col,
  ListGroup,
  ListGroupItem
} from '../components/react-bootstrap';
import ProjectDisplay from '../components/ProjectDisplay';
import Icon from 'shared/components/Icon';
import TimeDisplay from '../components/TimeDisplay';

const HomePage = props => (
  <div>
    <h1>Welcome to CIRCUS DB!</h1>
    <ul className="home-menu">
      <Menu
        link="/browse/case"
        icon="case-search"
        title="Case Search"
        description="Search and edit existing cases."
      />
      <Menu
        link="/browse/series"
        icon="series-search"
        title="Series Search"
        description="Search and edit existing cases."
      />
      <Menu
        link="/import-series"
        icon="series-import"
        title="Series Import"
        description="Upload DICOM image files directly via the browser."
      />
    </ul>
    <Profile />
  </div>
);
export default HomePage;

function role2str(role) {
  return role
    .replace(/Groups$/, '')
    .replace(/([A-Z])/g, (m, s) => ' ' + s.toLowerCase());
}

const MyProjects = ({ user }) => {
  return (
    <Panel
      bsStyle="primary"
      header={
        <span>
          <Glyphicon glyph="education" /> My Projects
        </span>
      }
    >
      <ListGroup fill>
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

const MyProfile = ({ user }) => {
  return (
    <Panel
      bsStyle="primary"
      className="home-profile"
      header={
        <span>
          <Glyphicon glyph="user" /> Profile
        </span>
      }
    >
      <ListGroup fill>
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
      <ul className="list-unstyled">
        <li>
          <b>Login ID:</b> {user.loginId}
        </li>
        <li>
          <b>Email:</b> {user.userEmail}
        </li>
        <li>
          <b>Last login:</b> <TimeDisplay value={user.lastLoginTime} />
          (from {user.lastLoginIp})
        </li>
        <li>
          <b>Groups:</b> {user.groups.join(', ')}
        </li>
        <li>
          <b>Domains:</b> {user.domains.join(', ')}
        </li>
      </ul>
    </Panel>
  );
};

const ProfileView = ({ user }) => {
  return (
    <Row>
      <Col md={7}>
        <MyProjects user={user} />
      </Col>
      <Col md={5}>
        <MyProfile user={user} />
      </Col>
    </Row>
  );
};

const Profile = connect(state => ({ user: state.loginUser.data }))(ProfileView);

const Menu = ({ link, icon, title, description }) => (
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
