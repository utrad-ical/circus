import React from 'react';
import { browserHistory } from 'react-router';
import { ButtonGroup, Button, Glyphicon } from '../react-bootstrap';

export const AdminIndex = props => {
	const btn = (to, link, glyph) => (
		<Button bsStyle="primary"
			onClick={() => browserHistory.push('admin/' + to)}
		>
			{glyph ?
				<span><Glyphicon glyph={glyph} />&ensp;</span>
			: null}
			{link}
		</Button>
	);

	return <div>
		<h1>Administration</h1>
		<ButtonGroup vertical>
			{btn('general', 'Server Configuration', 'tasks')}
			{btn('server', 'DICOM Image Server', 'hdd')}
			{btn('storage', 'Storage', 'save-file')}
			{btn('group', 'Groups', 'record')}
			{btn('user', 'Users', 'user')}
			{btn('project', 'Projects', 'education')}
		</ButtonGroup>
	</div>;
}
