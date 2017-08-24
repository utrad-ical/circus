import React from 'react';
import { PropertyEditor } from 'components/property-editor';
import { api } from 'utils/api';
import * as modal from 'components/modal';
import { showMessage } from 'actions';
import { Button, Glyphicon } from 'components/react-bootstrap';

export class GeneralAdmin extends React.Component {
	constructor(props) {
		super(props);
		this.state = { settings: null, complaints: null };
	}

	async loadSettings() {
		const settings = await api('server_param');
		this.setState({ settings, complaints: null });
	}

	componentDidMount() {
		this.loadSettings();
	}

	propertyChange(value) {
		if (value.domains.indexOf(value.defaultDomain) === -1) {
			value.defaultDomain = '';
		}
		if (value.defaultDomain === '' && value.domains.length > 0) {
			value.defaultDomain = value.domains[0];
		}
		this.setState({ settings: value });
	}

	async saveClick() {
		const newSettings = {
			...this.state.settings,
			domains:
				this.state.settings.domains.map(d => typeof d === 'string' ? d.trim() : '')
					.filter(d => typeof d === 'string' && d.length > 0)
		};
		this.setState({ settings: newSettings });
		try {
			await api('server_param', {
				method: 'post', // TODO: This should be PUT?
				data: newSettings,
				handleErrors: [400]
			});
			showMessage(
				'Settings saved.',
				'success',
				{ tag: 'general-admin', short: true }
			);
			this.loadSettings();
		} catch(err) {
			this.setState({ complaints: err.data.errors });
		}
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
				<Glyphicon glyph='tasks'/>&ensp;
				General Server Configuration
			</h1>
			<PropertyEditor
				value={this.state.settings}
				complaints={this.state.complaints}
				properties={properties}
				onChange={this.propertyChange.bind(this)}
			/>
			<p className='text-center'>
				<Button bsStyle='primary' onClick={() => this.saveClick()}>
					Save
				</Button>
				<Button bsStyle='link' onClick={() => this.loadSettings()}>
					Cancel
				</Button>
			</p>
		</div>;
	}
}
