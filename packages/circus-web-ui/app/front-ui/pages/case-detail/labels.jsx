import React from 'react';
import { ColorPicker } from '../../components/color-picker';
import { Popover, Button, OverlayTrigger, FormControl } from '../../components/react-bootstrap';

export const Labels = props => {
	return <ul className="case-label-list">
		{props.labels.map(label => (
			<Label label={label} key={label.id} />
		))}
	</ul>;
};

const labelColors = [
	'#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff00ff', '#00ffff'
];

export const Label = props => {
	const label = props.label;
	return <li className="label-list-item">
		{label.id} {label.title ? label.title : ''}
		<OpacityEditor value={100} onChange={() => 1} />
		<ColorPicker value="#00ff88" colors={labelColors} onChange={() => 1} />
	</li>;
};

const OpacityEditor = props => {
	const opacityEditor = <Popover><OpacityPopover {...props} /></Popover>;
	return <OverlayTrigger trigger="click" rootClose overlay={opacityEditor} placement="bottom">
		<Button bsStyle="default" bsSize="xs">{props.value}%</Button>
	</OverlayTrigger>;
};

const OpacityPopover = props => {
	return <div className="label-list-opacity-dropdown">
		<FormControl
			type="number"
			step={10}
			bsSize="sm"
			value={props.value}
			onChange={props.onChange}
		/>
	</div>;
};