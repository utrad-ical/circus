import React from 'react';
import { Link } from 'react-router';
import { connect } from 'react-redux';
import { Panel, Glyphicon, Row, Col, ListGroup, ListGroupItem }
	from 'components/react-bootstrap';
import moment from 'moment';

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
		<Profile />
	</div>

);

function role2str(role) {
	return role.replace(/Groups$/, '')
		.replace(/([A-Z])/g, (m, s) => (' ' + s.toLowerCase()));
}

const ProfileView = ({ user }) => {
	const lastLoginTime = moment(user.lastLoginTime).format('YYYY-MM-DD HH:mm:ss');
	return <Row>
		<Col md={7}>
			<Panel bsStyle="info" header={<span><Glyphicon glyph="education"/> Your Projects</span>}>
				<ListGroup fill>
					{user.accessibleProjects.map(p => (
						<ListGroupItem>
							<strong>{p.project.projectName}</strong>&ensp;
								<small>({p.roles.map(role2str).join(', ')})</small>
						</ListGroupItem>
					))}
				</ListGroup>
			</Panel>
		</Col>
		<Col md={5}>
			<Panel bsStyle="info" header={<span><Glyphicon glyph="user"/> Profile</span>}>
				<p>You are logged in as: <b>{user.description}</b></p>
				<dl>
					<dt>Login ID</dt><dd>{user.loginID}</dd>
					<dt>Email</dt><dd>{user.userEmail}</dd>
					<dt>Last login</dt><dd>{lastLoginTime} (from {user.lastLoginIP})</dd>
				</dl>
			</Panel>
		</Col>
	</Row>
};

const Profile = connect(
	state => ({ user: state.loginUser.data })
)(ProfileView);

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
