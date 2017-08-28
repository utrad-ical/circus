import React from 'react';
import { browserHistory } from 'react-router';
import { Button, Glyphicon } from 'components/react-bootstrap';

const Btn = ({ to, link, glyph }) => (
	<div className='item'>
		<Button
			block bsStyle='primary' bsSize='lg'
			onClick={() => browserHistory.push('admin/' + to)}
		>
			{glyph &&
				<span><Glyphicon glyph={glyph} />&ensp;</span>
			}
			{link}
		</Button>
	</div>
);

export default AdminIndex = props => {
	return <div className='admin-index'>
		<h1>
			<span className='circus-icon circus-icon-administration' />&ensp;
			Administration
		</h1>
		<div className='row'>
			<Btn to='general' link='Server Configuration' glyph='tasks' />
			<Btn to='server' link='DICOM Image Server'glyph='hdd' />
			<Btn to='storage' link='Storage'glyph='save-file' />
		</div>
		<div className='row'>
			<Btn to='group' link='Groups'glyph='record' />
			<Btn to='user' link='Users'glyph='user' />
			<Btn to='project' link='Projects'glyph='education' />
		</div>
	</div>;
};
