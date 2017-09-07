import React from 'react';
import { browserHistory } from 'react-router';
import { Button } from 'components/react-bootstrap';
import AdminContainer from './AdminContainer';
import Icon from 'components/Icon';

const Btn = ({ to, link, glyph }) => (
	<div className='item'>
		<Button
			block bsStyle='primary' bsSize='lg'
			onClick={() => browserHistory.push('admin/' + to)}
		>
			{glyph &&
				<span><Icon icon={glyph} />&ensp;</span>
			}
			{link}
		</Button>
	</div>
);

const AdminIndex = props => {
	return <AdminContainer
		title='Administration'
		icon='circus-administration'
		className='admin-index'
	>
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
	</AdminContainer>;
};

export default AdminIndex;