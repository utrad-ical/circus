import React from 'react';
import { Link } from 'react-router';

export const App = props => {
	return <div>
		<Nav />
		<div className="container">
			{props.children}
		</div>
	</div>;
};

const Nav = props => {
	return <header>
		<nav>
			<MainMenu>
				<li>
					<img src="/img/common/header-logo.png"
						alt="CIRCUS" className="header-logo" />
				</li>
				<Menu name="Case" link="browse-case">
					<SubMenu name="Case Search" link="browse-case"/>
				</Menu>
				<Menu name="Series" link="browse-series">
					<SubMenu name="Series Search" link="browse-series"/>
					<SubMenu name="Series Upload" link="series-upload"/>
				</Menu>
				<Menu name="Share" link="share">
					<SubMenu name="Share Search" link="dummy"/>
					<SubMenu name="Download" link="dummy"/>
					<SubMenu name="Import" link="dummy"/>
				</Menu>
				<Menu name="Administration" link="administration">
				</Menu>
			</MainMenu>
		</nav>
		<nav>
			<MainMenu>
				<li className="user-info">USER NAME</li>
				<Menu name="Preference" link="preference" />
				<Menu name="Logout" link="logout" />
			</MainMenu>
		</nav>
	</header>
};

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
