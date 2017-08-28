import React from 'react';
import { Link } from 'react-router';
import { connect } from 'react-redux';
import MessageBox from './MessageBox';
import { Button } from 'components/react-bootstrap';
import { logout } from 'actions';

/**
 * The main application container.
 * The navigation bar is always visible, but the main page content is
 * visible only after we confirmed the user is currently logged-in with valid session.
 */
const ApplicationView = props => {
	const pageContentVisible = !props.isUserFetching && props.isLoggedIn;
	const notLoggedIn = !props.isUserFetching && !props.isLoggedIn;

	const full = props.routes.some(r => r.component.name == 'CaseDetail');
	const containerClass = full ? 'full-container' : 'container';
	return <div>
		<Nav />
		<div className={containerClass}>
			<MessageBox />
			{ pageContentVisible ? props.children : null }
			{ notLoggedIn ?
				<div className='alert alert-danger'>
					You are not logged in, or your session has been expired.<br/>
					Please log in first.
					<div>
						<Link to='/'><Button>Login</Button></Link>
					</div>
				</div>
				: null }
		</div>
	</div>;
};

export default Application = connect(
	state => ({
		isUserFetching: state.loginUser.isFetching,
		isLoggedIn: state.loginUser.data !== null
	})
)(AppView);

const NavView = props => {
	return <header>
		<nav>
			<MainMenu>
				<li className='logo'>
					<Link to='/home'>
						<span className='circus-icon-logo' />
					</Link>
				</li>
				<Menu name='Case' link='/browse/case'>
					<SubMenu name='Case Search' link='/browse/case'/>
					<SubMenu name='Case Import' link='/import-case'/>
				</Menu>
				<Menu name='Series' link='/browse/series'>
					<SubMenu name='Series Search' link='/browse/series'/>
					<SubMenu name='Series Import' link='/import-series'/>
				</Menu>
				<Menu name='Tool'>
					<SubMenu name='Task List' link='/task-list'/>
					<SubMenu name='Preference' link='/preference' />
				</Menu>
				{ props.isAdmin ?
					<Menu name='Administration' link='/admin'>
						<SubMenu name='Server Configuration' link='/admin/general'/>
						<SubMenu name='DICOM Image Server' link='/admin/server'/>
						<SubMenu name='Storage' link='/admin/storage'/>
						<SubMenu name='Groups' link='/admin/group'/>
						<SubMenu name='Users' link='/admin/user'/>
						<SubMenu name='Project' link='/admin/project'/>
					</Menu>
					: null }
			</MainMenu>
		</nav>
		<nav>
			<MainMenu>
				<li className='user-info hidden-xs'>{props.loginUserName}</li>
				<Menu name='Logout' onClick={logout} />
			</MainMenu>
		</nav>
	</header>;
};

const Nav = connect(
	state => ({
		loginUserName: state.loginUser.data ? state.loginUser.data.description : '',
		isAdmin: state.loginUser.data && state.loginUser.data.privileges.indexOf('manageServer') > -1
	})
)(NavView);

const MainMenu = props => <ul>{props.children}</ul>;

const Menu = props => {
	const className = `circus-icon-${props.name.toLowerCase()}`;
	const caption = [
		<span className={className} key='icon'/>,
		<span className='hidden-xs' key='caption'>{props.name}</span>
	];
	return <li className='icon-menu' key={props.name} onClick={props.onClick}>
		{props.link ? <Link to={props.link}>{caption}</Link> : caption }
		<ul>{props.children}</ul>
	</li>;
};

const SubMenu = props => {
	return <li>
		<Link to={props.link}>{props.name}</Link>
	</li>;
};
