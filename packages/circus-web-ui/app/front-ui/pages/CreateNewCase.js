import React from 'react';
import ProjectSelector from 'components/ProjectSelector';
import { connect } from 'react-redux';
import IconButton from 'rb/IconButton';
import { Panel, ListGroup, ListGroupItem } from 'components/react-bootstrap';
import { api } from 'utils/api';

class CreateNewCaseView extends React.Component {
	constructor(props) {
		super(props);
		const writableProjects = this.writableProjects(props);
		if (writableProjects.length) {
			this.state = {
				selectedProject: writableProjects[0].projectId,
				selectedSeries: [props.params.uid]
			};
		}
		this.handleProjectSelect = this.handleProjectSelect.bind(this);
		this.handleCreate = this.handleCreate.bind(this);
	}

	writableProjects(props) {
		return props.user.accessibleProjects.filter(
			p => p.roles.indexOf('write') >= 0
		);
	}

	handleProjectSelect(projectId) {
		this.setState({ selectedProject: projectId });
	}

	async handleCreate() {
		const res = await api('cases', {
			method: 'post',
			data: {
				project: this.state.selectedProject,
				series: this.state.selectedSeries
			}
		});
		alert('Created!');
	}

	render() {
		// const { user } = this.props;
		const writableProjects = this.writableProjects(this.props);

		if (!writableProjects.length) {
			return <div className='alert alert-danger'>
				You do not belong to any writable project.
			</div>;
		}

		return <div>
			<h1><span className='circus-icon-case' />New Case</h1>
			<Panel collapsible defaultExpanded header='Series'>
				<ListGroup fill>
					{this.state.selectedSeries.map((s, i) => (
						<ListGroupItem key={s}>
							<b>Volume {i}</b>: {s}
						</ListGroupItem>
					))}
					<ListGroupItem>
						<IconButton icon='plus' bsSize='sm'>Add Another Series</IconButton>
					</ListGroupItem>
				</ListGroup>
			</Panel>
			<div>
				Project:&ensp;
				<ProjectSelector
					projects={writableProjects}
					value={this.state.selectedProject}
					onChange={this.handleProjectSelect}
				/>
				&ensp;
				<IconButton
					icon='star'
					bsStyle='primary'
					onClick={this.handleCreate}
				>
					Create
				</IconButton>
			</div>
		</div>;
	}
}

const CreateNewCase = connect(
	state => {
		return { user: state.loginUser.data };
	}
)(CreateNewCaseView);

export default CreateNewCase;