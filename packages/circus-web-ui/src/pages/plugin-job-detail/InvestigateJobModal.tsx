import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';
import { describePartialVolumeDescriptor } from '@utrad-ical/circus-lib/src/PartialVolumeDescriptor';
import { useCsResults } from '@utrad-ical/circus-ui-kit';
import Icon from 'components/Icon';
import IconButton from 'components/IconButton';
import { Modal, Tab, Tabs } from 'components/react-bootstrap';
import { SeriesEntry } from 'components/SeriesSelector';
import TimeDisplay from 'components/TimeDisplay';
import UserDisplay from 'components/UserDisplay';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

const InvestigateJobModal: React.FC<{}> = React.memo(props => {
  const { job, loadAttachment } = useCsResults();
  const { results, series, feedbacks } = job;

  const [attachments, setAttachments] = useState<string[]>();
  useEffect(() => {
    loadAttachment.list().then(setAttachments);
  }, [loadAttachment]);

  const [log, setLog] = useState<string>();
  useEffect(() => {
    loadAttachment('plugin-log.txt')
      .then(res => res.text())
      .then(setLog);
  }, [loadAttachment]);

  return (
    <>
      <Modal.Header>
        <Icon icon="search" /> Investigate Job
      </Modal.Header>
      <Modal.Body>
        <Tabs id="investigate-job-tabs" defaultActiveKey={1}>
          <Tab eventKey={1} title="Overview">
            <table className="table table-hover">
              <tbody>
                <tr>
                  <th>Job Status</th>
                  <td>{job.status}</td>
                </tr>
                <tr>
                  <th>Job registered at</th>
                  <td>
                    <TimeDisplay value={job.createdAt} />
                  </td>
                </tr>
                <tr>
                  <th>Started at</th>
                  <td>
                    <TimeDisplay value={job.startedAt} />
                  </td>
                </tr>
                <tr>
                  <th>Finished at</th>
                  <td>
                    <TimeDisplay value={job.finishedAt} />
                  </td>
                </tr>
                <tr>
                  <th>Started by</th>
                  <td>
                    <UserDisplay userEmail={job.userEmail} />
                  </td>
                </tr>
                <tr>
                  <th>Series</th>
                  <td>
                    <SeriesEntries value={series} />
                  </td>
                </tr>
              </tbody>
            </table>
          </Tab>
          <Tab eventKey={2} title="Raw Results">
            <pre>{JSON.stringify(results, null, '  ')}</pre>
          </Tab>
          <Tab eventKey={3} title="Files">
            {Array.isArray(attachments) ? (
              <>
                <table className="table table-hover">
                  <tbody>
                    {attachments.map((f, i) => (
                      <tr key={i}>
                        <td>{f}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p>{attachments.length} files in results directory.</p>
              </>
            ) : (
              <LoadingIndicator />
            )}
          </Tab>
          <Tab eventKey={4} title="Log">
            <pre>{log ?? <LoadingIndicator />}</pre>
          </Tab>
          <Tab eventKey={5} title="Feedback">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Entered by</th>
                  <th>Entered at</th>
                  <th>Content</th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.map((fb, i) => (
                  <tr key={i}>
                    <td>{fb.isConsensual ? 'Consensual' : 'Personal'}</td>
                    <td>
                      <UserDisplay userEmail={fb.userEmail} />
                    </td>
                    <td>
                      <TimeDisplay value={fb.createdAt} />
                    </td>
                    <td>
                      <FeedbackContent value={fb.data} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Tab>
        </Tabs>
      </Modal.Body>
    </>
  );
});

const SeriesEntries: React.FC<{ value: SeriesEntry[] }> = props => {
  const { value } = props;
  return (
    <SeriesEntriesGridDiv>
      {value.map((s, i) => (
        <React.Fragment key={i}>
          <div>#{i}</div>
          <div>
            {s.seriesUid} (
            {s.partialVolumeDescriptor !== 'auto'
              ? describePartialVolumeDescriptor(s.partialVolumeDescriptor!)
              : 'auto'}
            )
          </div>
        </React.Fragment>
      ))}
    </SeriesEntriesGridDiv>
  );
};

const SeriesEntriesGridDiv = styled.div`
  display: grid;
  grid-template-columns: auto auto;
  gap: 3px;
`;

const FeedbackContent: React.FC<{ value: any }> = props => {
  const { value } = props;
  const [show, setShow] = useState(false);
  if (!show)
    return (
      <IconButton
        bsSize="xs"
        bsStyle="primary"
        icon="chevron-right"
        onClick={() => setShow(true)}
      >
        Show
      </IconButton>
    );
  return <>{JSON.stringify(value)}</>;
};

export default InvestigateJobModal;
