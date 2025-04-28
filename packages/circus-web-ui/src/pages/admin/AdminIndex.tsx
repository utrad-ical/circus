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
  <Link to={`${to}`}>
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
        <Btn
          to="general"
          link="Server Configuration"
          glyph="material-grid_view"
        />
      </Row>
      <Row>
        <Btn to="group" link="Groups" glyph="material-radio_button_checked" />
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
        <Btn to="plugin-job-queue" link="Job Queue" glyph="material-lists" />
      </Row>
    </AdminContainer>
  );
};

export default AdminIndex;
