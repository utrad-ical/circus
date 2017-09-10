import React from 'react';
import PropertyEditor from 'rb/PropertyEditor';
import * as et from 'rb/editor-types';
import ShrinkSelect from 'rb/ShrinkSelect';
import { api } from 'utils/api';
import { showMessage } from 'actions';
import { Button } from 'components/react-bootstrap';

export default class Preferences extends React.Component {
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
		await api('preference', {
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
				editor: props => <ShrinkSelect
					options={{ mode_white: 'White', mode_black: 'Black' }}
					{...props}
				/>
			},
			{
				caption: 'Show Personal Info',
				key: 'personalInfoView',
				editor: et.checkbox({ label: 'show' })
			}
		];

		return <div>
			<h1>
				<span className='circus-icon circus-icon-preference' />&ensp;
				Preferences
			</h1>
			<PropertyEditor
				value={this.state.settings}
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
