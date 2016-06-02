import React from 'react';
import { Link } from 'react-router';

export const Home = props => (
	<div>
		<h1>Welcome to CIRCUS DB!</h1>
		<ul className="home-menu">
			<Menu link="/browse/case" icon="case-search" title="Case Search"
				description="Search and edit existing cases." />
			<Menu link="/browse/series" icon="series-search" title="Series Search"
				description="Search and edit existing cases." />
			<Menu link="/import-series" icon="series-import" title="Series Import"
				description="Upload DICOM image files directly via the browser." />
		</ul>
	</div>
);

const Menu = ({ link, icon, title, description }) => (
	<li>
		<Link to={link}>
			<div className="img">
				<span className={'circus-icon circus-icon-' + icon}></span>
			</div>
			<p>{title}</p>
		</Link>
		<p>{description}</p>
	</li>
);
