import React from 'react';
import { startNewSearch } from 'actions';

/**
 * Composes search condition box and search result pane.
 */
export default class SearchCommon extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			condition: null,
		};
	}

	conditionChange(newCondition) {
		this.setState({ condition: newCondition });
	}

	searchClick(filter) {
		startNewSearch(
			this.searchName,
			this.searchName,
			filter,
			this.defaultSort
		);
	}

	render() {
		const ConditionComp = this.conditionComp;
		const ResultComp = this.resultComp;
		return <div>
			<h1>
				<span className={'circus-icon-' + this.glyph} />&ensp;
				{this.title}
			</h1>
			<ConditionComp condition={this.state.condition}
				onSearch={this.searchClick.bind(this)}
				onChange={this.conditionChange.bind(this)}
			/>
			{ /* <pre>{JSON.stringify(this.state.filter, null, '  ')}</pre> */ }
			<ResultComp />
		</div>;
	}
}
