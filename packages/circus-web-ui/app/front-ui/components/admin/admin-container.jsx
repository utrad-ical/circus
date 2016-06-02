import React from 'react';
import { connect } from 'react-redux';

const ContainerView = props => {
	if (props.isAdmin) {
		return <div>{props.children}</div>;
	} else {
		return <div className="alert alert-danger">
			You don't have privilege to access administration page.
		</div>
	}
};

const stateToProps = state => ({
	isAdmin: state.loginUser && state.loginUser.privileges.indexOf('manageServer') > -1
});

export const AdminContainer = connect(stateToProps)(ContainerView);
