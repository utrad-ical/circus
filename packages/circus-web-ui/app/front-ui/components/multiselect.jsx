import React from 'react';
import { Dropdown } from 'react-bootstrap';

const DefaultRenderer = props => <span>{props.caption}</span>;

/**
 * Dropdown + Multiselect component.
 */
export const MultiSelect = props => {
	const Renderer = props.renderer || DefaultRenderer;
	const { showSelectedMax = 3, selected = [] } = props;

	// Normalize options
	let options = { ... props.options };
	if (Array.isArray(props.options)) {
		options = {};
		props.options.forEach(opt => options[opt] = { caption: opt });
	}
	Object.keys(options).forEach(key => {
		if (typeof options[key] === 'string') options[key] = { caption: options[key] };
	});

	function onItemClick(event, clickedIndex, checked) {
		let newSelected = [];
		Object.keys(options).forEach((key, i) => {
			const insertingKey = props.numericalValue ? parseFloat(key) : key;
			if (clickedIndex !== i) {
				if (selected.indexOf(insertingKey) !== -1) newSelected.push(insertingKey);
			} else {
				if (!checked) newSelected.push(insertingKey);
			}
		});
		typeof props.onChange === 'function' && props.onChange(newSelected);
	}

	let caption = [];
	if (selected.length === 0) {
		caption = props.noneText ? props.noneText : '(None)';
	} else if (selected.length > showSelectedMax) {
		caption = `${selected.length} selected`;
	} else {
		selected.forEach((sel, i) => {
			let renderItem = options[sel];
			if (i > 0) caption.push(props.glue !== undefined ? props.glue : ', ');
			caption.push(<Renderer key={i} {...renderItem} />);
		});
	}

	const dropdown = <ul>
		{Object.keys(options).map((key, i) => {
			const checked = selected.some(sel => sel == key); // lazy equiality('==') needed
			const checkedClass = checked ? 'checked' : '';
			let renderItem = options[key];
			return <li key={i} onClick={event => onItemClick(event, i, checked)} className={checkedClass}>
				<input type="checkbox" checked={checked} readOnly />&ensp;
				<Renderer {...renderItem} />
			</li>
		})}
	</ul>;

	return <Dropdown className="multiselect">
		<Dropdown.Toggle>{caption}</Dropdown.Toggle>
		<Dropdown.Menu className="multiselect-popover">{dropdown}</Dropdown.Menu>
	</Dropdown>;
}
