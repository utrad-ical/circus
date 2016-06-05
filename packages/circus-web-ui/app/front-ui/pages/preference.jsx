import React from 'react';
import { PropertyEditor } from 'components/property-editor';
import { api } from 'utils/api';
import { showMessage } from 'actions';
import { Button } from 'components/react-bootstrap';

export class Preference extends React.Component {
	constructor(props) {
		super(props);
		this.state = { settings: null };
	}

	async loadSettings() {
		const settings = await api('preference');
		this.setState({ settings });
	}

	componentDidMount() {
		this.loadSettings();
	}

	propertyChange(value) {
		this.setState({ settings: value });
	}

	async saveClick() {
		const settings = await api('preference', {
			method: 'post', // TODO: This should be PUT?
			data: this.state.settings
		});
		showMessage('Your preference was saved.', 'success', { short: true });
		this.loadSettings();
	}

	render() {
		if (this.state.settings === null) return <div />;

		const properties = [
			{
				caption: 'Color Theme',
				key: 'theme',
				type: 'select',
				spec: { options: { mode_white: 'White', mode_black: 'Black' } }
			 },
			 {
				 caption: 'Show Personal Info',
				 key: 'personalInfoView',
				 type: 'checkbox'
			 }
		];

		return <div>
			<h1>
				<span className="circus-icon circus-icon-preference" />&ensp;
				Preferences
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
