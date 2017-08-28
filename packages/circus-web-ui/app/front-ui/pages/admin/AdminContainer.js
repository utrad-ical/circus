import React from 'react';
import { connect } from 'react-redux';

const ContainerView = props => {
	if (props.isAdmin) {
		return <div>{props.children}</div>;
	} else {
		return <div className='alert alert-danger'>
			You do not have privilege to access administration page.
		</div>;
	}
};

const stateToProps = state => ({
	isAdmin: state.loginUser.data && state.loginUser.data.privileges.indexOf('manageServer') > -1
});

export default AdminContainer = connect(stateToProps)(ContainerView);
