import React from 'react';
import { Link } from 'react-router';

export const Home = props => (
	<div>
		<h1>Welcome to CIRCUS DB!</h1>
		<ul className="home-menu">
			<li>
				<Link to="/browse/case">
					<div className="img"><span className="circus-icon circus-icon-case-search"></span></div>
					<p>Case Search</p>
				</Link>
				<p>Search and edit existing cases.</p>
			</li>
			<li>
				<Link to="browse/series">
					<div className="img"><span className="circus-icon circus-icon-series-search"></span></div>
					<p>Series Search</p>
				</Link>
				<p>Search uploaded series,<br/> and define new cases.</p>
			</li>
			<li>
				<Link to="/import-series">
					<div className="img"><span className="circus-icon circus-icon-series-import"></span></div>
					<p>Series Import</p>
				</Link>
				<p>Upload DICOM image files directly via the browser.</p>
			</li>
		</ul>
	</div>
);
