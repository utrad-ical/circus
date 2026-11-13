import Button from '#components/Button.tsx';
import React from 'react';
import { Link } from 'react-router-dom';
import AdminContainer from './AdminContainer.tsx';
import styles from './AdminIndex.module.css';

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

const AdminIndex: React.FC = () => {
  return (
    <AdminContainer
      title="Administration"
      icon="circus-administration"
      className="admin-index"
    >
      <div className={styles.row}>
        <Btn
          to="general"
          link="Server Configuration"
          glyph="material-grid_view"
        />
      </div>
      <div className={styles.row}>
        <Btn to="group" link="Groups" glyph="material-groups" />
        <Btn to="user" link="Users" glyph="material-person" />
      </div>
      <h3>CIRCUS DB</h3>
      <div className={styles.row}>
        <Btn to="project" link="Projects" glyph="material-school" />
      </div>
      <h3>CIRCUS CS</h3>
      <div className={styles.row}>
        <Btn
          to="plugin-job-manager"
          link="Job Manager"
          glyph="material-list_alt"
        />
        <Btn to="plugins" link="CAD Plug-ins" glyph="circus-app" />
      </div>
      <div className={styles.row}>
        <Btn
          to="plugin-job-queue"
          link="Job Queue"
          glyph="material-pending_actions"
        />
      </div>
    </AdminContainer>
  );
};

export default AdminIndex;
