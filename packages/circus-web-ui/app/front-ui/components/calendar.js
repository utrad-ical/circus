import React from 'react';
import { Glyphicon } from './react-bootstrap';
import moment from 'moment';

export class Calendar extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			year: props.initialYear || moment().year(),
			month: props.initialMonth || (moment().month() + 1)
		};
	}

	nav(delta, unit) {
		const newDate =
			moment({ year: this.state.year, month: this.state.month - 1})
			.add(delta, unit);
		this.setState({ year: newDate.year(), month: newDate.month() + 1 });
	}

	render() {
		return <div className="calendar">
			<div className="calendar-nav">
				<Glyphicon glyph="backward" onClick={() => this.nav(-1, 'year')} />
				<Glyphicon glyph="triangle-left" onClick={() => this.nav(-1, 'month')} />
				{this.state.year} - {this.state.month}
				<Glyphicon glyph="triangle-right" onClick={() => this.nav(1, 'month')} />
				<Glyphicon glyph="forward" onClick={() => this.nav(1, 'year')} />
			</div>
			<CalendarTable
				onDateClick={this.props.onDateClick}
				year={this.state.year}
				month={this.state.month}
			/>
		</div>;
	}
};

function split(array, every) {
	let result = [];
	let i = 0;
	while (i < array.length) {
		result.push(array.slice(i, i + every));
		i += every;
	}
	return result;
}

export const CalendarTable = props => {
	const start = moment({
		year: props.year, month: props.month - 1, day: 1
	}).startOf('week');
	const last = moment({
		year: props.year, month: props.month - 1
	}).endOf('month').endOf('week').startOf('day');
	const lastTimestamp = last.unix();

	let days = [];
	let i = 0;
	let date = '0000-00-00';
	while (true) {
		const date = start.clone().add(i, 'day');
		days.push(date);
		if (date.unix() >= lastTimestamp) break;
		i++;
	}
	const weeks = split(days, 7);

	function handleClick(date) {
		typeof props.onDateClick === 'function' && props.onDateClick(date);
	}

	return <table className="calendar-table">
		<thead>
			<tr><th>Su</th><th>Mo</th><th>Tu</th><th>We</th><th>Th</th><th>Fr</th><th>Sa</th></tr>
		</thead>
		<tbody>
			{weeks.map(week => <tr key={week[0].dayOfYear()}>
				{week.map(date => <td key={date.dayOfYear()} onClick={() => handleClick(date)}>
					{date.date()}
				</td>)}
			</tr>)}
		</tbody>
	</table>
}
