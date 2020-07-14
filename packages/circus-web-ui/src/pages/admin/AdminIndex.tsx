import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'components/react-bootstrap';
import AdminContainer from './AdminContainer';
import Icon from 'components/Icon';

const Btn: React.FC<{
  to: string;
  link: string;
  glyph: string;
}> = ({ to, link, glyph }) => (
  <div className="item">
    <Link to={`admin/${to}`}>
      <Button block bsStyle="primary" bsSize="lg">
        <Icon icon={glyph} />
        &ensp;{link}
      </Button>
    </Link>
  </div>
);

const AdminIndex: React.FC = () => {
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
        <Btn to="group" link="Groups" glyph="record" />
        <Btn to="user" link="Users" glyph="user" />
      </div>
      <h3>CIRCUS DB</h3>
      <div className="row">
        <Btn to="project" link="Projects" glyph="education" />
      </div>
      <h3>CIRCUS CS</h3>
      <div className="row">
        <Btn to="plugin-job-manager" link="Job Manager" glyph="list-alt" />
        <Btn to="plugins" link="CAD Plug-ins" glyph="circus-app" />
      </div>
      <div className="row">
        <Btn to="plugin-job-queue" link="Job Queue" glyph="list" />
      </div>
    </AdminContainer>
  );
};

export default AdminIndex;