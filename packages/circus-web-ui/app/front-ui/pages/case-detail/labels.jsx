import React from 'react';
import { ColorPicker } from '../../components/color-picker';
import { Popover, Button, OverlayTrigger, FormControl, Glyphicon } from '../../components/react-bootstrap';
import { RawData, PixelFormat } from 'circus-rs';

const labelColors = [
	'#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff00ff', '#00ffff'
];

export const LabelSelector = props => {
	const { revision, onChange } = props;

	function changeSeries(index, newSeries) {
		const newRev = {
			...revision,
			series: [... revision.series]
		};
		newRev.series[index] = newSeries;
		onChange(newRev);
	}

	return <ul className="case-series-list">
		{revision.series.map((series, index) => (
			<Series series={series} index={index} key={series.seriesUID} onChange={changeSeries} />
		))}
	</ul>;
};

const Series = props => {
	const { index: seriesIndex, series, onChange } = props;

	function changeActiveLabel(label) {

	}

	function changeLabel(labelIndex, label) {
		const newSeries = {
			...series,
			labels: [...series.labels]
		};
		newSeries.labels[labelIndex] = label;
		onChange(seriesIndex, newSeries);
	}

	function addLabel() {
		const newLabel = {
			color: '#ff0000',
			alpha: 1,
			volume: new RawData([16, 16, 16], PixelFormat.Binary)
		};
		const newSeries = {
			...series,
			labels: [...series.labels, newLabel]
		};
		onChange(seriesIndex, newSeries);
	}

	function removeLabel(labelIndex) {
		if (!confirm('Delete?')) return;
		const newSeries = {
			...series,
			labels: series.labels.filter((l, i) => labelIndex !== i)
		};
		onChange(seriesIndex, newSeries);
	}

	return <li className="case-series-list-item"> Series #{seriesIndex}
		<ul className="case-label-list">
			{series.labels.map((label, index) => (
				<Label
					label={label}
					index={index}
					key={index}
					onChange={() => changeLabel(label)}
					onClick={changeActiveLabel}
					onRemoveClick={() => removeLabel(index)}
				/>
			))}
		</ul>
		<div className="case-label-buttons">
			<Button bsSize="xs" onClick={addLabel}>
				<Glyphicon glyph="plus"/> Add Label
			</Button>
		</div>
	</li>;
};

export const Label = props => {
	const { label, index: labelIndex, onChange, onClick, onRemoveClick } = props;
	const caption = label.title ? label.title : `Label #${props.index}`;

	function changeLabelAlpha(alpha) {
		const newLabel = { ...label, alpha };
		onChange(labelIndex, newLabel);
	}

	function changeLabelColor(color) {
		const newLabel = { ...label, color };
		onChange(labelIndex, newLabel);
	}

	return <li className="label-list-item">
		{caption}
		<div onClick={onClick}>
			<OpacityEditor value={label.alpha} onChange={changeLabelAlpha} />
			<ColorPicker value={label.color} colors={labelColors} onChange={changeLabelColor} />
			<Button bsSize="xs" onClick={onRemoveClick}><Glyphicon glyph="remove" /></Button>
		</div>
	</li>;
};

const OpacityEditor = props => {
	const opacityEditor = <Popover><OpacityPopover {...props} /></Popover>;
	return <OverlayTrigger trigger="click" rootClose overlay={opacityEditor} placement="bottom">
		<Button bsStyle="default" bsSize="xs">{props.value * 100}%</Button>
	</OverlayTrigger>;
};

const OpacityPopover = props => {
	const { onChange, value } = props;
	return <div className="label-list-opacity-dropdown">
		{ value === 0 ?
			<Button bsStyle="link" bsSize="sm" onClick={() => onChange(1)}>
				<Glyphicon glyph="eye-close" />
			</Button>
		:
			<Button bsStyle="link" bsSize="sm" onClick={() => onChange(0)}>
				<Glyphicon glyph="eye-open" />
			</Button>
		}
		<FormControl
			type="number"
			step={10}
			min={0}
			max={100}
			bsSize="sm"
			value={value * 100}
			onChange={ev => props.onChange(ev.target.value / 100)}
		/>
	</div>;
};
