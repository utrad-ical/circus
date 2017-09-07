import React from 'react';
import { connect } from 'react-redux';
import Icon from 'components/Icon';

const AdminContainerView = props => {
	const { title, icon, className } = props;
	if (props.isAdmin) {
		return <div className={className}>
			<h1>
				<Icon icon={icon} />&ensp;
				{title}
			</h1>
			{props.children}
		</div>;
	} else {
		return <div className='alert alert-danger'>
			You do not have privilege to access administration page.
		</div>;
	}
};

const stateToProps = state => ({
	isAdmin: state.loginUser.data && state.loginUser.data.privileges.indexOf('manageServer') > -1
});

const AdminContainer = connect(stateToProps)(AdminContainerView);
export default AdminContainer;
