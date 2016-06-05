import React from 'react';
import { PropertyEditor } from 'components/property-editor';
import { api } from 'utils/api';
import * as modal from 'components/modal';
import { showMessage } from 'actions';
import { Button, Glyphicon } from 'components/react-bootstrap';

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
		showMessage(
			'Settings saved.',
			'success',
			{ tag: 'general-admin', short: true }
		);
		this.loadSettings();
	}

	render() {
		if (this.state.settings === null) return <div />;

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

		return <div>
			<h1>
				<Glyphicon glyph="tasks"/>&ensp;
				General Server Configuration
			</h1>
			<PropertyEditor
				value={this.state.settings}
				properties={properties}
				onChange={this.propertyChange.bind(this)}/>
			<p className="text-center">
				<Button bsStyle="primary" onClick={() => this.saveClick()}>
					Save
				</Button>
				<Button bsStyle="link" onClick={() => this.loadSettings()}>
					Cancel
				</Button>
			</p>
		</div>;
	}
}
