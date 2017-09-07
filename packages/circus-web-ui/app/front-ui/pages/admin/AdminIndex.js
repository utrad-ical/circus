import React from 'react';
import { Link } from 'react-router';
import { Button } from 'components/react-bootstrap';
import AdminContainer from './AdminContainer';
import Icon from 'components/Icon';

const Btn = ({ to, link, glyph }) => (
	<div className='item'>
		<Link to={`admin/${to}`}>
			<Button
				block bsStyle='primary' bsSize='lg'
			>
				<Icon icon={glyph} />&ensp;{link}
			</Button>
		</Link>
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