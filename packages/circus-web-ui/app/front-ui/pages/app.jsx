import React from 'react';
import { Link } from 'react-router';
import { connect } from 'react-redux';
import { MessageBox } from './message-box';

export const App = props => {
	return <div>
		<Nav />
		<div className="container">
			<MessageBox />
			{props.children}
		</div>
	</div>;
};

const NavView = props => {
	return <header>
		<nav>
			<MainMenu>
				<li className="logo">
					<Link to="/home">
						<span className="circus-icon-logo" />
					</Link>
				</li>
				<Menu name="Case" link="/browse/case">
					<SubMenu name="Case Search" link="/browse/case"/>
					<SubMenu name="Case Import" link="/import-case"/>
				</Menu>
				<Menu name="Series" link="/browse/series">
					<SubMenu name="Series Search" link="/browse/series"/>
					<SubMenu name="Series Import" link="/import-series"/>
				</Menu>
				<Menu name="Tool">
					<SubMenu name="Task List" link="/task-list"/>
					<SubMenu name="Preference" link="/preference" />
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
	const className = `circus-icon-${props.name.toLowerCase()}`;
	const caption = [
		<span className={className} key='icon'/>,
		<span className="hidden-xs" key='caption'>{props.name}</span>
	];
	return <li className="icon-menu" key={props.name}>
		{props.link ? <Link to={props.link}>{caption}</Link> : caption }
		<ul>{props.children}</ul>
	</li>;
};

const SubMenu = props => {
	return <li>
		<Link to={props.link}>{props.name}</Link>
	</li>
};
