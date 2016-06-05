import React from 'react';
import { browserHistory } from 'react-router';
import { ButtonGroup, Button, Glyphicon } from 'components/react-bootstrap';

export const AdminIndex = props => {
	const btn = (to, link, glyph) => (
		<div className="item">
			<Button block bsStyle="primary" bsSize="lg"
				onClick={() => browserHistory.push('admin/' + to)}
			>
				{glyph ?
					<span><Glyphicon glyph={glyph} />&ensp;</span>
				: null}
				{link}
			</Button>
		</div>
	);

	return <div className="admin-index">
		<h1>
			<span className="circus-icon circus-icon-administration" />&ensp;
			Administration
		</h1>
		<div className="row">
			{btn('general', 'Server Configuration', 'tasks')}
			{btn('server', 'DICOM Image Server', 'hdd')}
			{btn('storage', 'Storage', 'save-file')}
		</div>
		<div className="row">
			{btn('group', 'Groups', 'record')}
			{btn('user', 'Users', 'user')}
			{btn('project', 'Projects', 'education')}
		</div>
	</div>;
}
