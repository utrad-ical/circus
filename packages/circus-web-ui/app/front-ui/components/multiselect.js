import React from 'react';
import { Dropdown } from 'react-bootstrap';

const DefaultRenderer = props => <span>{props.caption}</span>;

/**
 * Dropdown + Multiselect component.
 */
export const MultiSelect = props => {
	const { renderer = DefaultRenderer,
		showSelectedMax = 3,
		selected = [],
		type = 'dropdown',
	 	glue = ', ',
	 	noneText = '(None)'
	} = props;

	// Normalize options
	let options = { ... props.options };
	if (Array.isArray(props.options)) {
		options = {};
		props.options.forEach(opt => options[opt] = { caption: opt });
	}
	Object.keys(options).forEach(key => {
		if (typeof options[key] === 'string') options[key] = { caption: options[key] };
	});

	function onItemChange(clickedIndex, checked) {
		const newSelected = [];
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

	if (type === 'dropdown') {
		return <MultiSelectDropdown selected={selected}
			options={options} renderer={renderer}
			glue={glue} showSelectedMax={showSelectedMax} noneText={noneText}
			onItemChange={onItemChange}
		/>;
	} else {
		return <MultiSelectCheckboxArray selected={selected}
			options={options} renderer={renderer}
			onItemChange={onItemChange}
		/>;
	}

};

const MultiSelectDropdown = props => {
	const Renderer = props.renderer;
	const selected = props.selected;

	let caption = [];
	if (selected.length === 0) {
		caption = props.noneText;
	} else if (selected.length > props.showSelectedMax) {
		caption = `${selected.length} selected`;
	} else {
		selected.forEach((sel, i) => {
			const renderItem = props.options[sel];
			if (i > 0) caption.push(props.glue);
			caption.push(<Renderer key={i} {...renderItem} />);
		});
	}

	const dropdown = <ul id='multiselect-dropdown'>
		{Object.keys(props.options).map((key, i) => {
			const checked = selected.some(sel => sel == key); // lazy equiality('==') needed
			const checkedClass = checked ? 'checked' : '';
			const renderItem = props.options[key];
			return (
				<li key={i}
					onClick={() => props.onItemChange(i, checked)}
					className={checkedClass}
				>
					<input type='checkbox' checked={checked} readOnly />&ensp;
					<Renderer {...renderItem} />
				</li>
			);
		})}
	</ul>;

	return <Dropdown className='multiselect'>
		<Dropdown.Toggle>{caption}</Dropdown.Toggle>
		<Dropdown.Menu className='multiselect-popover'>{dropdown}</Dropdown.Menu>
	</Dropdown>;
};


const MultiSelectCheckboxArray = props => {
	const Renderer = props.renderer;
	const selected = props.selected;

	return <ul className='list-unstyled'>
		{Object.keys(props.options).map((key, i) => {
			const checked = selected.some(sel => sel == key); // lazy equiality('==') needed
			const checkedClass = checked ? 'checked' : '';
			const renderItem = props.options[key];
			return (
				<li key={i}
					onClick={() => props.onItemChange(i, checked)}
					className={checkedClass}
				>
					<input type='checkbox' checked={checked} readOnly />&ensp;
					<Renderer {...renderItem} />
				</li>
			);
		})}
	</ul>;
};
