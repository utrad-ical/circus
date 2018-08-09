import React from 'react';
import { Link } from 'react-router';
import { Button } from 'shared/components/react-bootstrap';
import AdminContainer from './AdminContainer';
import Icon from 'shared/components/Icon';

const Btn = ({ to, link, glyph }) => (
  <div className="item">
    <Link to={`admin/${to}`}>
      <Button block bsStyle="primary" bsSize="lg">
        <Icon icon={glyph} />&ensp;{link}
      </Button>
    </Link>
  </div>
);

const AdminIndex = props => {
  return (
    <AdminContainer
      title="Administration"
      icon="circus-administration"
      className="admin-index"
    >
      <div className="row">
        <Btn to="general" link="Server Configuration" glyph="th-large" />
      </div>
      <div className="row">
        <Btn to="project" link="Projects" glyph="education" />
      </div>
      <div className="row">
        <Btn to="group" link="Groups" glyph="record" />
        <Btn to="user" link="Users" glyph="user" />
      </div>
    </AdminContainer>
  );
};

export default AdminIndex;
