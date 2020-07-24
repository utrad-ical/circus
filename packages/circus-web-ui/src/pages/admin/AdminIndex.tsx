import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'components/react-bootstrap';
import AdminContainer from './AdminContainer';
import Icon from 'components/Icon';
import styled from 'styled-components';

const Btn: React.FC<{
  to: string;
  link: string;
  glyph: string;
}> = ({ to, link, glyph }) => (
  <Link to={`admin/${to}`}>
    <Button block bsStyle="primary" bsSize="lg">
      <Icon icon={glyph} />
      &ensp;{link}
    </Button>
  </Link>
);

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  > a {
    display: block;
    margin-bottom: 20px;
    margin-right: 10px;
    flex: 0 0 320px;
  }
`;

const AdminIndex: React.FC = () => {
  return (
    <AdminContainer
      title="Administration"
      icon="circus-administration"
      className="admin-index"
    >
      <Row>
        <Btn to="general" link="Server Configuration" glyph="th-large" />
      </Row>
      <Row>
        <Btn to="group" link="Groups" glyph="record" />
        <Btn to="user" link="Users" glyph="user" />
      </Row>
      <h3>CIRCUS DB</h3>
      <Row>
        <Btn to="project" link="Projects" glyph="education" />
      </Row>
      <h3>CIRCUS CS</h3>
      <Row>
        <Btn to="plugin-job-manager" link="Job Manager" glyph="list-alt" />
        <Btn to="plugins" link="CAD Plug-ins" glyph="circus-app" />
      </Row>
      <Row>
        <Btn to="plugin-job-queue" link="Job Queue" glyph="list" />
      </Row>
    </AdminContainer>
  );
};

export default AdminIndex;
