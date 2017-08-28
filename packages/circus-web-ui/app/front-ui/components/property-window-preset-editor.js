import React from 'react';
import { FormControl } from './react-bootstrap';

export const WindowPresetEditor = props => {
	const change = (key, newValue) => {
		const newPreset = { ...props.value };
		newPreset[key] = newValue;
		props.onChange && props.onChange(newPreset);
	};

	return <span>
		Name: <FormControl value={props.value.name}
			onChange={ev => change('name', ev.target.value)} />
		&emsp;
		Level: <FormControl value={props.value.level} type="number" style={{width: '100px'}}
			onChange={ev => change('level', parseFloat(ev.target.value))} />
		&emsp;
		Window: <FormControl value={props.value.width} type="number" style={{width: '100px'}}
			onChange={ev => change('width', parseFloat(ev.target.value))} />
	</span>;
};

WindowPresetEditor.newItem = items => {
	let num = 0;
	const name = num => 'Preset' + (num === 0 ? '' : num);
	while (true) {
		if (!items.some(item => name(num) === item.name)) break;
		num++;
	};
	return { name: name(num), level: 50, width: 100 };
};
