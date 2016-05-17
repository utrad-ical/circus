import React from 'react';
import { FormControl } from './react-bootstrap';
import { ColorPicker } from './color-picker.jsx';
import { Tag } from './tag.jsx';

export const TagEditor = props => {
	const change = (key, newValue) => {
		const newPreset = { ...props.value };
		newPreset[key] = newValue;
		props.onChange && props.onChange(newPreset);
	};

	return <span>
		<FormControl value={props.value.name}
			onChange={ev => change('name', ev.target.value)} />
		&emsp;
		<ColorPicker value={props.value.color} showColorCode={true}
			onChange={col => change('color', col)} />
		&emsp;
		Sample: <Tag name={props.value.name} color={props.value.color} />
	</span>;
};

TagEditor.newItem = items => {
	let num = 0;
	const name = num => 'Untitled' + (num === 0 ? '' : num);
	while (true) {
		if (!items.some(item => name(num) === item.name)) break;
		num++;
	};
	return { name: name(num), color: '#ff8888' };
};
