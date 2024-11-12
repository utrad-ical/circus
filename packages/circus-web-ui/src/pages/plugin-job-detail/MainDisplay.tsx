import React, { useState, useEffect } from 'react';
import {
  Display,
  useCsResults,
  FeedbackEntry,
  FeedbackTarget,
  FeedbackReport
} from '@utrad-ical/circus-ui-kit';
import Section from './Section';
import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';
import { produce } from 'immer';

const MainDisplay: Display<FeedbackTarget[], any> = props => {
  const {
    initialFeedbackValue,
    options: displayStrategy,
    onFeedbackChange
  } = props;
  const { job, consensual, eventLogger, loadDisplay } = useCsResults();

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
      valid: boolean | 'no-feedback';
      display: Display<any, any> | undefined;
    };
  }>(() =>
    Object.fromEntries(
      displayStrategy.map(s => [
        s.feedbackKey,
        { valid: 'no-feedback', display: undefined }
      ])
    )
  );

  const handleChange = (
    feedbackKey: string,
    state: FeedbackReport<unknown>
  ) => {
    setFeedbackMeta(
      produce((draft: typeof feedbackMeta) => {
        draft[feedbackKey].valid = state.valid;
      })
    );
    if (state.valid) {
      setFeedback({ ...feedback, [feedbackKey]: state.value });
    }
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
  }, [displayStrategy, loadDisplay]);

  useEffect(() => {
    const requiredDisplays = displayStrategy.filter(
      s => feedbackMeta[s.feedbackKey].valid !== 'no-feedback'
    );
    const unfinishedDisplays = displayStrategy.filter(
      s => feedbackMeta[s.feedbackKey].valid === false
    );
    const valid = unfinishedDisplays.length === 0;
    if (valid) {
      onFeedbackChange({ valid: true, value: feedback });
    } else {
      onFeedbackChange({
        valid: false,
        error: {
          total: requiredDisplays.length,
          finished: requiredDisplays.length - unfinishedDisplays.length
        }
      });
    }
  }, [displayStrategy, feedback, feedbackMeta, onFeedbackChange]);

  const personalOpinionsForKey = (key: string): FeedbackEntry<any>[] => {
    if (!consensual) return [];
    return job.feedbacks
      .filter(f => !f.isConsensual)
      .map(f => ({ ...f, data: f.data[key] }));
  };

  const displayReady = displayStrategy.every(
    s => feedbackMeta[s.feedbackKey].display !== undefined
  );

  useEffect(() => {
    if (displayReady) eventLogger('Show plug-in results');
  }, [displayReady, eventLogger]);

  if (!displayReady) {
    return (
      <div className="job-detail-main">
        <LoadingIndicator />
      </div>
    );
  }

  return (
    <div className="job-detail-main">
      <div className="feedback-targets">
        {displayStrategy.map(strategy => {
          const { feedbackKey, caption, options = {} } = strategy;
          const Display: Display<typeof options, any> =
            feedbackMeta[feedbackKey].display!;
          return (
            <Section key={feedbackKey} title={caption ?? feedbackKey ?? ''}>
              <Display
                initialFeedbackValue={initialFeedbackValue[feedbackKey]}
                personalOpinions={personalOpinionsForKey(feedbackKey)}
                options={options}
                onFeedbackChange={state => handleChange(feedbackKey, state)}
              />
            </Section>
          );
        })}
      </div>
    </div>
  );
};

export default MainDisplay;
