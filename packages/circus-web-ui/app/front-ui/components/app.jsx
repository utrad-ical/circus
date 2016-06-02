import React from 'react';
import { Link } from 'react-router';
import { connect } from 'react-redux';

export const App = props => {
	return <div>
		<Nav />
		<div className="container">
			{props.children}
		</div>
	</div>;
};

const NavView = props => {
	return <header>
		<nav>
			<MainMenu>
				<li>
					<Link to="/home">
						<img src="/img/common/header-logo.png"
							alt="CIRCUS" className="header-logo" />
					</Link>
				</li>
				<Menu name="Case" link="/browse/case">
					<SubMenu name="Case Search" link="/browse/case"/>
				</Menu>
				<Menu name="Series" link="/browse/series">
					<SubMenu name="Series Search" link="/browse/series"/>
					<SubMenu name="Series Import" link="/import-series"/>
				</Menu>
				<Menu name="Share" link="/share">
					<SubMenu name="Share Search" link="dummy"/>
					<SubMenu name="Download" link="dummy"/>
					<SubMenu name="Import" link="dummy"/>
				</Menu>
				{ props.isAdmin ?
					<Menu name="Administration" link="/admin">
						<SubMenu name="Server Configuration" link="/admin/general"/>
						<SubMenu name="DICOM Image Server" link="/admin/server"/>
						<SubMenu name="Storage" link="/admin/storage"/>
						<SubMenu name="Groups" link="/admin/group"/>
						<SubMenu name="Users" link="/admin/user"/>
						<SubMenu name="Project" link="/admin/project"/>
					</Menu>
				: null }
			</MainMenu>
		</nav>
		<nav>
			<MainMenu>
				<li className="user-info">{props.loginUserName}</li>
				<Menu name="Preference" link="/preference" />
				<Menu name="Logout" link="logout" />
			</MainMenu>
		</nav>
	</header>
};

const Nav = connect(
	state => ({
		loginUserName: state.loginUser ? state.loginUser.description : '',
		isAdmin: state.loginUser && state.loginUser.privileges.indexOf('manageServer') > -1
	})
)(NavView);

const MainMenu = props => <ul>{props.children}</ul>;

const Menu = props => {
	const className = `circus-icon circus-icon-${props.name.toLowerCase()}`;
	return <li className="icon-menu">
		<Link to={props.link}>
			<span className={className} />
			{props.name}
		</Link>
		<ul>{props.children}</ul>
	</li>;
};

const SubMenu = props => {
	return <li>
		<Link to={props.link}>{props.name}</Link>
	</li>
};
