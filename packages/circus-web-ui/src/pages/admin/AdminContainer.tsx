import React from 'react';
import Icon from 'components/Icon';
import useLoginUser from 'utils/useLoginUser';

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
      <div className="alert alert-danger">
        You do not have privilege to access the administration pages.
      </div>
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
