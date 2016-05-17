import React from 'react';
import { Popover, OverlayTrigger } from './react-bootstrap';
import tinycolor from 'tinycolor2';

// Colors based on simple-color-picker released under the MIT License
// Copyright (c) 2010 Rachel Carvalho <rachel.carvalho@gmail.com>

export const ColorPicker = props => {
	const palette = <Popover><ColorPalette {...props} /></Popover>;
	const color = tinycolor(props.value || '#ffffff');
	const style = {
		backgroundColor: color.toHexString(),
		borderColor: color.clone().darken().toHexString()
	};
	const className = 'color-picker' + (props.showColorCode ? ' color-code' : '');
	if (props.showColorCode) {
		style.color = tinycolor.mostReadable(color, ['#000', '#fff']).toHexString();
	};
	return <OverlayTrigger trigger="click" rootClose overlay={palette} placement="bottom">
		<div className={className} style={style}>
			{props.showColorCode ? color.toHexString() : '' }
		</div>
	</OverlayTrigger>;
}

ColorPicker.newItem = () => '#ffffff';

const paletteColors = [
	'#000000', '#444444', '#666666', '#999999', '#cccccc', '#eeeeee', '#f3f3f3', '#ffffff',
	'#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#9900ff', '#ff00ff',
	'#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#cfe2f3', '#d9d2e9', '#ead1dc',
	'#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#9fc5e8', '#b4a7d6', '#d5a6bd',
	'#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6fa8dc', '#8e7cc3', '#c27ba0',
	'#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3d85c6', '#674ea7', '#a64d79',
	'#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#0b5394', '#351c75', '#741b47',
	'#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#073763', '#20124d', '#4C1130'
];

export const ColorPalette = props => {
	return <div className="color-picker-palette">
		{paletteColors.map(color => (
			<div
				className={'color-picker-palette-color' + (color === props.color ? ' selected' : '')}
				style={{ backgroundColor: color }}
				onClick={props.onChange.bind(null, color)}
			/>
		))}
	</div>;
}
