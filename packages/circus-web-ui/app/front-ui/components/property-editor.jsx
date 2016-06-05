import React from 'react';
import { Row, Col, ControlLabel, FormControl, Button, Glyphicon, Checkbox } from './react-bootstrap';
import { ColorPicker } from './color-picker';
import { MultiSelect } from './multiselect';

const Select = props => {
	let options = {};
	if (Array.isArray(props.spec.options)) {
		props.spec.options.forEach(o => options[o] = o);
	} else if (typeof options === 'object' && options !== null) {
		options = props.spec.options;
	}
	const value = (props.value === null || props.value === undefined) ? '' : props.value;

	return <FormControl componentClass="select" value={value}
		onChange={ev => props.onChange(ev.target.value)}>
		<option key='#NULL#' value='' hidden disabled></option>
		{Object.keys(options).map(k => <option key={k} value={k}>{options[k]}</option>)}
	</FormControl>;
};

const FlexList = props => {
	const items = props.value || [];
	const childrenType = props.spec.childrenType || 'text';
	const childrenSpec = props.spec.childrenSpec || {};
	const Comp = typeToComponent(childrenType);

	const change = (idx, newValue) => {
		let newList = items.slice();
		newList[idx] = newValue;
		props.onChange && props.onChange(newList);
	};

	const add = () => {
		let newList = items.slice();
		let newItem = Comp.newItem instanceof Function ? Comp.newItem(items) : null;
		newList.push(newItem);
		props.onChange && props.onChange(newList);
	};

	const remove = index => {
		let newList = items.slice()
		newList.splice(index, 1);
		props.onChange && props.onChange(newList);
	};

	return <div>
		<ul className="flex-list form-inline">
			{items.map((item, index) => {
				return <li key={index}>
					<Comp value={item} spec={childrenSpec} onChange={val => change(index, val)} />
					<Button bsStyle="link" onClick={() => remove(index)}>
						<Glyphicon glyph="remove" />
					</Button>
				</li>;
			})}
		</ul>
		<div><Button bsStyle="link" onClick={add}><Glyphicon glyph="plus" /> Add</Button></div>
	</div>;
}

const types = {
	text: props => <FormControl value={props.value}
		onChange={ev => props.onChange(ev.target.value)} />,
	number: props => <FormControl type="number" value={props.value}
		onChange={ev => props.onChange(ev.target.value)} />,
	password: props => <FormControl type="password" value={props.value}
		onChange={ev => props.onChange(ev.target.value)} />,
	checkbox: props => <Checkbox checked={props.value}
		onClick={ev => props.onChange(!props.value)} />,
	constant: props => <ControlLabel>{props.value}</ControlLabel>,
	select: Select,
	multiselect: props => <MultiSelect options={props.spec.options}
		selected={props.value} numericalValue={!!props.spec.numericalValue}
		onChange={selected => props.onChange(selected)} />,
	color: props => <ColorPicker value={props.value} onChange={props.onChange} showColorCode={true} />,
	list: FlexList
};

const typeToComponent = type => {
	let Comp;
	if (typeof type === 'function') {
		Comp = type;
	} else if (typeof type === 'string' && type in types) {
		Comp = types[type];
	} else {
		Comp = props => <span>Error: Unknown property type</span>;
	}
	return Comp;
};

export const PropertyEditor = props => {
	const values = props.value || {};
	const complaints = props.complaints !== null && typeof props.complaints === 'object' ? props.complaints : {};
	const valueChange = (key, value) => {
		const newValues = { ... values };
		newValues[key] = value;
		props.onChange && props.onChange(newValues);
	};

	const rows = props.properties.map(property => {
		const Comp = typeToComponent(property.type);
		const key = property.key;
		const spec = property.spec || {};
		const complain = complaints[key];
		const row = [
			<Row key={key} className={complain ? 'bg-danger' : ''}>
				<Col md={3}><ControlLabel>{property.caption}</ControlLabel></Col>
				<Col md={9}>
					{<Comp value={values[key]} spec={spec} onChange={val => valueChange(key, val)} />}
				</Col>
			</Row>
		];
		if (complain) {
			row.push(<div className="text-danger complaint">
				{complaints[key]}
			</div>);
		}
		return row;
	});

	return <div className="property-editor form-horizontal">{rows}</div>;
};
