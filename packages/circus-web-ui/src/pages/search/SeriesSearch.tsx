import React from 'react';
import SeriesSearchCondition from './SeriesSearchCondition';
import SeriesSearchResults from './SeriesSearchResults';
import Icon from 'components/Icon';

const SeriesSearch: React.FC<{}> = props => {
  return (
    <div>
      <h1>
        <Icon icon="circus-series" /> Series Search
      </h1>
      <SeriesSearchCondition />
      <SeriesSearchResults searchName="series" />
    </div>
  );
};

export default SeriesSearch;
