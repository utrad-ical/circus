import React from 'react';
import { DropdownButton, MenuItem } from './react-bootstrap';
import { RelativeDatePicker, normalizeRelative } from './relative-datepicker.jsx';
import Form from 'react-bootstrap/lib/Form';

const presets = {
	today: { caption: 'Today' },
	yesterday: { caption: 'Yesterday', from: [-1, 'day'], to: [-1, 'day'] },
	last2days: { caption: 'Last 2 days', from: [-1, 'day'] },
	last1week: { caption: 'Last 1 Week', from: [-6, 'day'] },
	last1month: { caption: 'Last 1 month', from: [-1, 'month'] },
	last6months: { caption: 'Last 3 months', from: [-3, 'month'] },
	last1year: { caption: 'Last 1 year', from: [-1, 'year'] },
	all: { caption: 'All', from: null, to: null }
};

export const DateRangePicker = props => {
	const { from = null, to = null } = (props.value || {});

	const fmt = 'YYYY-MM-DD';

	function fromChange(date) {
		const newValue = { from: date, to };
		props.onChange(newValue);
	}

	function toChange(date) {
		const newValue = { from, to: date };
		props.onChange(newValue);
	}

	function presetSelect(key) {
		const newValue = {
			from: 'from' in presets[key] ? presets[key].from : [0, 'day'],
			to: 'to' in presets[key] ? presets[key].to : [0, 'day'],
		};
		props.onChange(newValue);
	}

	return <div className="daterange-picker">
		<div className="form-inline">
			<RelativeDatePicker value={from} onChange={fromChange}/>
			&thinsp;&mdash;&thinsp;
			<RelativeDatePicker value={to} onChange={toChange}/>
			<DropdownButton onSelect={presetSelect} bsStyle="link" title="" id="relative-daterange-preset-dropdown">
				{Object.keys(presets).map(key => (
					<MenuItem key={key} eventKey={key}>{presets[key].caption}</MenuItem>
				))}
			</DropdownButton>
		</div>
	</div>;
};

export const dateRangeToMongoQuery = (condition, key) => {
	const result = { $and: [] };
	const from = normalizeRelative(condition.from);
	if (from) result.$and.push({ [key]: { $gte: { $date: from } } });
	const to = normalizeRelative(condition.to);
	if (to) result.$and.push({ [key]: { $lte: { $date: to } } });
	return (from || to) ? result : null;
};
