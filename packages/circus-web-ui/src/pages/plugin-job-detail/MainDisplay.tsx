import React, { useState, useEffect } from 'react';
import {
  Display,
  useCsResults,
  FeedbackEntry,
  FeedbackTarget
} from '@utrad-ical/circus-cs-results';
import Section from './Section';
import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';
import loadDisplay from './loadDisplay';
import produce from 'immer';

const MainDisplay: Display<FeedbackTarget[], any> = props => {
  const {
    initialFeedbackValue,
    options: displayStrategy,
    onFeedbackChange,
    onFeedbackValidate
  } = props;
  const { job, consensual } = useCsResults();

  const [feedback, setFeedback] = useState<{ [feedbackKey: string]: any }>(() =>
    Object.fromEntries(
      displayStrategy.map(s => [
        s.feedbackKey,
        initialFeedbackValue[s.feedbackKey]
      ])
    )
  );

  const [feedbackMeta, setFeedbackMeta] = useState<{
    [feedbackKey: string]: {
      valid: boolean;
      display: Display<any, any> | undefined;
    };
  }>(() =>
    Object.fromEntries(
      displayStrategy.map(s => [
        s.feedbackKey,
        { valid: false, display: undefined }
      ])
    )
  );

  const handleChange = (feedbackKey: string, value: any) => {
    const newFeedback = { ...feedback, [feedbackKey]: value };
    setFeedback(newFeedback);
  };

  const handleValidate = (feedbackKey: string, valid: boolean) => {
    setFeedbackMeta(
      produce(draft => {
        draft[feedbackKey].valid = valid;
      })
    );
  };

  useEffect(() => {
    const load = async () => {
      const displays = await Promise.all(
        displayStrategy.map(ds => loadDisplay(ds.type))
      );
      setFeedbackMeta(
        produce(draft => {
          displayStrategy.forEach(
            (ds, i) => (draft[ds.feedbackKey].display = displays[i])
          );
        })
      );
    };
    load();
  }, [displayStrategy]);

  useEffect(() => {
    const valids = displayStrategy.filter(
      s => feedbackMeta[s.feedbackKey].valid
    );
    const valid = valids.length === displayStrategy.length;
    onFeedbackValidate(valid);
    if (valid) onFeedbackChange(feedback);
  }, [
    displayStrategy,
    feedback,
    feedbackMeta,
    onFeedbackChange,
    onFeedbackValidate
  ]);

  const personalOpinionsForKey = (key: string): FeedbackEntry<any>[] => {
    if (!consensual) return [];
    return job.feedbacks
      .filter(f => !f.isConsensual)
      .map(f => ({ ...f, data: f.data[key] }));
  };

  const displayReady = displayStrategy.every(
    s => feedbackMeta[s.feedbackKey].display !== undefined
  );
  if (!displayReady)
    return (
      <div className="job-detail-main">
        <LoadingIndicator />
      </div>
    );

  return (
    <div className="job-detail-main">
      <div className="feedback-targets">
        {displayStrategy.map(strategy => {
          const { feedbackKey, caption, options } = strategy;
          const Display = feedbackMeta[feedbackKey].display!;
          return (
            <Section key={feedbackKey} title={caption}>
              <Display
                initialFeedbackValue={initialFeedbackValue[feedbackKey]}
                onFeedbackValidate={valid => handleValidate(feedbackKey, valid)}
                personalOpinions={personalOpinionsForKey(feedbackKey)}
                options={options}
                onFeedbackChange={value => handleChange(feedbackKey, value)}
              />
            </Section>
          );
        })}
      </div>
    </div>
  );
};

export default MainDisplay;
