import Alert from '#components/Alert.tsx';
import React from 'react';
import Icon from '#components/Icon.tsx';
import useLoginUser from '#utils/useLoginUser.ts';

const AdminContainer: React.FC<{
  title: string;
  icon: string;
  className?: string;
}> = props => {
  const { title, icon, className } = props;

  const user = useLoginUser();
  const isAdmin = user && user.globalPrivileges.indexOf('manageServer') > -1;

  if (!isAdmin) {
    return (
      <Alert variant="danger">
        You do not have privilege to access the administration pages.
      </Alert>
    );
  }

  return (
    <div className={className}>
      <h1>
        <Icon icon={icon} />
        &ensp;
        {title}
      </h1>
      {props.children}
    </div>
  );
};

export default AdminContainer;
