import React from 'react';
import { CaseSearchCondition } from './search-condition-case.jsx';
// import { CaseSearchResults } from './search-results-series.jsx';

export class CaseSearch extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			caseCondition: {
				projects: [],
				type: 'basic',
				basicFilter: {},
				advancedFilter: { $and: [] }
			},
			caseSearchResults: null
		};
	}

	conditionChange(newCondition) {
		this.setState({ caseCondition: newCondition });
	};

	search(condition) {
		const params = { data: { filter: condition } };
		api('case', params).then(results => {
			this.setState({ caseSearchResults: results });
		});
	}

	render() {
		return <div>
			<CaseSearchCondition condition={this.state.caseCondition}
				projects={this.state.projectList}
				onSearch={this.search.bind(this)}
				onChange={this.conditionChange.bind(this)} />
			{ /* Array.isArray(this.state.caseSearchResults) ?
				<CaseSearchResults items={this.state.caseSearchResults} />
			: null */ }
		</div>;
	}
};
