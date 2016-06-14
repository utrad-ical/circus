import React from 'react';

/**
 * Composes search condition box and search result pane.
 */
export class SearchCommon extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			condition: null,
			filter: null
		};
	}

	conditionChange(newCondition) {
		this.setState({ condition: newCondition });
	};

	searchClick(filter) {
		this.setState({ filter });
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
				onChange={this.conditionChange.bind(this)} />
			{ /* <pre>{JSON.stringify(this.state.filter, null, '  ')}</pre> */ }
			<ResultComp filter={this.state.filter} />
		</div>;
	}
};
