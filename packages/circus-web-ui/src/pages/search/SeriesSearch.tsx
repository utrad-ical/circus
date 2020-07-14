import React from 'react';
import SeriesSearchCondition from './SeriesSearchCondition';
import SeriesSearchResults from './SeriesSearchResults';
import Icon from 'components/Icon';
import { useParams } from 'react-router-dom';

const SeriesSearch: React.FC<{}> = props => {
  const presetName = useParams<any>().presetName;
  return (
    <div>
      <h1>
        <Icon icon="circus-series" /> Series Search
      </h1>
      <SeriesSearchCondition presetName={presetName} />
      <SeriesSearchResults />
    </div>
  );
};

export default SeriesSearch;
