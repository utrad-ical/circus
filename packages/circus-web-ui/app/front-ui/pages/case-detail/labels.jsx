import React from 'react';
import { ColorPicker } from '../../components/color-picker';
import { Popover, Button, OverlayTrigger, FormControl, Glyphicon } from '../../components/react-bootstrap';

export const LabelSelector = props => {
	return <ul className="case-series-list">
		{props.revision.series.map((series, index) => (
			<Series series={series} index={index + 1} key={series.seriesUID} />
		))}
	</ul>;
};

const Series = props => {
	const { index, series, addLabel } = props;
	return <li className="case-series-list-item"> Series #{index}
		<ul className="case-label-list">
			{props.series.labels.map((label, index) => (
				<Label label={label} index={index + 1} key={label.id} />
			))}
		</ul>
		<div className="case-label-buttons">
			<Button bsSize="xs" onClick={() => addLabel(index)}>
				<Glyphicon glyph="plus"/> Add Label
			</Button>
		</div>
	</li>;
};

const labelColors = [
	'#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff00ff', '#00ffff'
];

export const Label = props => {
	const { label, onClick = () => {} } = props;
	const caption = label.title ? label.title : `Label #${props.index}`;
	return <li className="label-list-item">
		{caption}
		<div onClick={onClick}>
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
