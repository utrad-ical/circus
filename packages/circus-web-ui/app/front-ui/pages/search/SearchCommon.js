import React from 'react';
import { startNewSearch } from 'actions';
import Icon from 'components/Icon';

/**
 * Composes search condition box and search result pane.
 */
export default class SearchCommon extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			condition: props.defaultCondition
		};
		this.handleConditionChange = this.handleConditionChange.bind(this);
		this.handleSearchClick = this.handleSearchClick.bind(this);
	}

	handleConditionChange(newCondition) {
		this.setState({ condition: newCondition });
	}

	handleSearchClick(filter) {
		const { searchName, resource, defaultSort } = this.props;
		startNewSearch(
			searchName,
			resource,
			filter,
			defaultSort
		);
	}

	render() {
		const {
			icon,
			title,
			conditionComp: ConditionComp,
			resultComp: ResultComp
		} = this.props;
		return <div>
			<h1>
				<Icon icon={icon} />&ensp;{title}
			</h1>
			<ConditionComp
				condition={this.state.condition}
				onSearch={this.handleSearchClick}
				onChange={this.handleConditionChange}
			/>
			{ /* <pre>{JSON.stringify(this.state.filter, null, '  ')}</pre> */ }
			<ResultComp />
		</div>;
	}
}
