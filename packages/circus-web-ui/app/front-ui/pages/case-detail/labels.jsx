import React from 'react';
import { ColorPicker } from '../../components/color-picker';
import { Popover, Button, OverlayTrigger, FormControl, Panel } from '../../components/react-bootstrap';

export const LabelSelector = props => {
	return <ul className="case-series-list">
		{props.revision.series.map((series, index) => (
			<Series series={series} index={index + 1} key={series.seriesUID} />
		))}
	</ul>;
};

const Series = props => {
	return <li className="case-series-list-item">
		Series #{props.index}
		<ul className="case-label-list">
			{props.series.labels.map((label, index) => (
				<Label label={label} index={index + 1} key={label.id} />
			))}
		</ul>
	</li>;
};

const labelColors = [
	'#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff00ff', '#00ffff'
];

export const Label = props => {
	const label = props.label;
	const caption = label.title ? label.title : `Label #${props.index}`;
	return <li className="label-list-item">
		{caption}
		<div>
			<OpacityEditor value={100} onChange={() => 1} />
			<ColorPicker value="#00ff88" colors={labelColors} onChange={() => 1} />
		</div>
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
