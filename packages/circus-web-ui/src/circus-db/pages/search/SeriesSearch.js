import React from 'react';
import SeriesSearchCondition from './SeriesSearchCondition';
import SeriesSearchResults from './SeriesSearchResults';
import Icon from '../../components/Icon';

const SeriesSearch = props => (
  <div>
    <h1>
      <Icon icon="circus-series" /> Series Search
    </h1>
    <SeriesSearchCondition presetName={props.params.presetName} />
    <SeriesSearchResults />
  </div>
);

export default SeriesSearch;
