import React from 'react';
import { DropdownButton, MenuItem, Glyphicon } from './react-bootstrap';

export let ShrinkSelect = props => {
	let { options = [], defaultSelect = null } = props;

	function select(key) {
		if (props.onChange instanceof Function) {
			props.onChange(key);
		}
	}

	if (Array.isArray(props.options)) {
		const tmp = {};
		props.options.forEach(k => tmp[k] = k);
		options = tmp;
	}

	const title = props.value in options ?
		options[props.value] :
		(defaultSelect !== null ? options[defaultSelect] : '');

	const style = props.bsStyle ? props.bsStyle : 'default';
	const size = 'size' in props ? props.size : null;

	return <DropdownButton title={title} bsStyle={style}
	bsSize={size} id='shrink-select-dropdown'>
		{Object.keys(options).map(key => (
			<MenuItem key={key} onClick={() => select(key)}>
				{options[key]}
			</MenuItem>
		))}
	</DropdownButton>;
};
