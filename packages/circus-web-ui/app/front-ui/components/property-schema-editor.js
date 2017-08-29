import React from 'react';
import ShrinkSelect from 'rb/ShrinkSelect';
import { FormControl } from './react-bootstrap';
import { StringListEditor } from './string-list-editor';

export const PropertySchemaEditor = props => {
	const types = {
		text: 'Text',
		number: 'Number',
		select: 'Select',
		multiselect: 'Multiple Select',
		checkbox: 'Checkbox'
	};

	const change = (what, val) => {
		const newValue = { ...props.value };
		newValue[what] = val;
		if (what === 'type') delete newValue.spec;
		props.onChange && props.onChange(newValue);
	};

	const specChange = (what, val) => {
		const spec = { ...props.value.spec };
		spec[what] = val;
		const newValue = { ...props.value, spec };
		props.onChange && props.onChange(newValue);
	};

	const specs = (type, spec) => {
		if (type === 'select' || type === 'multiselect') {
			return <StringListEditor value={spec.options} onChange={v => specChange('options', v)}/>;
		}
		return null;
	};

	return <span>
		<FormControl type='text' value={props.value.key}
			placeholder='Property name' onChange={ev => change('key', ev.target.value)}
		/>
		<ShrinkSelect options={types} size={null} bsStyle='primary'
			value={props.value.type} onChange={t => change('type', t)}
		/>
		{specs(props.value.type, props.value.spec || {})}
	</span>;
};

PropertySchemaEditor.newItem = items => {
	let num = 0;
	const name = num => 'property' + (num === 0 ? '' : num);
	while (true) {
		if (!items.some(item => name(num) === item.key)) break;
		num++;
	}
	return { key: name(num), type: 'text' };
};
