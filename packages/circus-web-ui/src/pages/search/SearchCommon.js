import React from 'react';
import { startNewSearch } from 'actions';
import { store } from 'store';
import Icon from 'components/Icon';

/**
 * Composes search condition box and search result pane.
 */
export default class SearchCommon extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			condition: props.nullCondition()
		};
		this.handleConditionChange = this.handleConditionChange.bind(this);
		this.handleSearchClick = this.handleSearchClick.bind(this);
	}

	handleConditionChange(newCondition) {
		this.setState({ condition: newCondition });
	}

	handleSearchClick(filter) {
		const { searchName, resource, defaultSort } = this.props;
		store.dispatch(startNewSearch(
			searchName,
			resource,
			filter,
			defaultSort
		));
	}

	render() {
		const {
			icon,
			title,
			nullCondition,
			conditionComp: ConditionComp,
			resultComp: ResultComp
		} = this.props;
		return <div>
			<h1>
				<Icon icon={icon} />&ensp;{title}
			</h1>
			<ConditionComp
				condition={this.state.condition}
				nullCondition={nullCondition}
				onSearch={this.handleSearchClick}
				onChange={this.handleConditionChange}
			/>
			{ /* <pre>{JSON.stringify(this.state.filter, null, '  ')}</pre> */ }
			<ResultComp />
		</div>;
	}
}
