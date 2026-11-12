import Button from '#components/Button.tsx';
import React from 'react';
import { Link } from 'react-router-dom';
import AdminContainer from './AdminContainer.tsx';
import styled from 'styled-components';

const Btn: React.FC<{
  to: string;
  link: string;
  glyph: string;
}> = ({ to, link, glyph }) => (
  <Link to={`${to}`}>
    <Button variant="primary" size="large" icon={glyph}>
      {link}
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
    > button {
      width: 100%;
    }
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
        <Btn
          to="general"
          link="Server Configuration"
          glyph="material-grid_view"
        />
      </Row>
      <Row>
        <Btn to="group" link="Groups" glyph="material-groups" />
        <Btn to="user" link="Users" glyph="material-person" />
      </Row>
      <h3>CIRCUS DB</h3>
      <Row>
        <Btn to="project" link="Projects" glyph="material-school" />
      </Row>
      <h3>CIRCUS CS</h3>
      <Row>
        <Btn
          to="plugin-job-manager"
          link="Job Manager"
          glyph="material-list_alt"
        />
        <Btn to="plugins" link="CAD Plug-ins" glyph="circus-app" />
      </Row>
      <Row>
        <Btn
          to="plugin-job-queue"
          link="Job Queue"
          glyph="material-pending_actions"
        />
      </Row>
    </AdminContainer>
  );
};

export default AdminIndex;
