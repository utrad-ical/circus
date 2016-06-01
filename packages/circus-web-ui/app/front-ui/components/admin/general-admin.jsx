import React from 'react';
import { PropertyEditor } from '../property-editor';
import { api } from 'utils/api';
import * as modal from '../modal';
import { Button } from '../react-bootstrap';

export class GeneralAdmin extends React.Component {
	constructor(props) {
		super(props);
		this.state = { settings: null };
	}

	async loadSettings() {
		const settings = await api('server_param');
		this.setState({ settings });
	}

	componentDidMount() {
		this.loadSettings();
	}

	propertyChange(value) {
		this.setState({ settings: value });
	}

	async saveClick() {
		const settings = await api('server_param', {
			method: 'post', // TODO: This should be PUT?
			data: this.state.settings
		});
		await modal.alert('Saved!');
		this.loadSettings();
	}

	render() {
		let pane = <div>Loading...</div>;
		if (this.state.settings !== null) {
			const properties = [
				{
					caption: 'Domains',
					key: 'domains',
					type: 'list',
					spec: { childrenType: 'text' }
				},
				{
					caption: 'Default Domain',
					key: 'defaultDomain',
					type: 'select',
					spec: { options: this.state.settings.domains }
				}
			];
			pane = <div>
				<PropertyEditor
					value={this.state.settings}
					properties={properties}
					onChange={this.propertyChange.bind(this)}/>;
				<p className="text-center">
					<Button bsStyle="primary" onClick={() => this.saveClick()}>
						Save
					</Button>
					<Button bsStyle="link" onClick={() => this.loadSettings()}>
						Cancel
					</Button>
				</p>
			</div>
		}
		return <div>
			<h1>General Server Configuration</h1>
			{pane}
		</div>
	}
}
