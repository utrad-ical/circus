import React from 'react';

import { FormControl, Dropdown, ButtonGroup, Button } from 'react-bootstrap';
import { Calendar } from './calendar.jsx';
import moment from 'moment';

function dateToString(input) {
	if (typeof input === 'string') return input;
	if (input === null) return '(All)';
	let [delta, unit] = input;
	if (unit === 'day') {
		if (delta === 0) return 'Today';
		if (delta === -1) return 'Yesterday';
	}
	if (Math.abs(delta) > 1) unit += 's';
	return (delta < 0) ? `${-delta} ${unit} ago` : `${delta} ${unit} from now`;
}

export class RelativeDatePicker extends React.Component {
	constructor(props) {
		super(props);
		this.state = { mode: 'all' };
	}

	triggerChange(value) {
		if (typeof this.props.onChange === 'function') {
			this.props.onChange(value);
		}
	}

	dateClick(date) {
		const dateStr = date.format('YYYY-MM-DD');
		this.triggerChange(dateStr);
	}

	adjustMode() {
		let mode = 'absolute';
		if (this.props.value === null) mode = 'all';
		if (Array.isArray(this.props.value)) mode = 'relative';
		this.setState({ mode });
	}

	setMode(mode) {
		if (mode === 'relative') {
			this.triggerChange([0, 'day']);
		} else if (mode === 'all') {
			this.triggerChange(null);
		}
		this.setState({ mode });
	}

	relativeValueChange(value) {
		this.triggerChange([-value, 'day']);
	}

	render() {
		const { mode } = this.state;
		const editor = <div className="relative-datepicker-menu" id="relative-datepicker-popover">
			<ButtonGroup bsSize="xsmall">
				<Button
					bsStyle={mode === 'relative' ? 'primary' : 'default'}
					onClick={() => this.setMode('relative')}
				>Relative</Button>
				<Button
					bsStyle={mode === 'absolute' ? 'primary' : 'default'}
					onClick={() => this.setMode('absolute')}
				>Absolute</Button>
				<Button
					bsStyle={mode === 'all' ? 'primary' : 'default'}
					onClick={() => this.setMode('all')}
				>All</Button>
			</ButtonGroup>
			<div className="switch">
				{mode === 'relative' ?
					<div className="form-inline">
						<FormControl bsSize="sm" type="number" min={0}
							value={Array.isArray(this.props.value) ? -this.props.value[0] : 0}
							onChange={ev => this.relativeValueChange(ev.target.value)} />
						&ensp;days ago
					</div>
				: mode === 'all' ?
					null
				:
					<Calendar onDateClick={date => this.dateClick(date)}/>
				}
			</div>
		</div>;

		return <Dropdown onDrop={() => this.adjustMode()}>
			<Dropdown.Toggle>{dateToString(this.props.value)}</Dropdown.Toggle>
			<Dropdown.Menu>{editor}</Dropdown.Menu>
		</Dropdown>;
	}
}

export const normalizeRelative = dateValue => {
	if (typeof dateValue === 'string') {
		return moment(dateValue);
	} else if (typeof dateValue === 'object') {
		return moment().startOf('day').add(...dateValue);
	}
	return null
};
