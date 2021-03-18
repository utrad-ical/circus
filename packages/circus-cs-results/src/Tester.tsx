import CsResultsContext, { PluginAttachmentLoader } from './CsResultsContext';
import React, { useState, useMemo } from 'react';

const defaultAttachmentLoader = async () => {
  return new Response();
};

/**
 * This is a utility component with which you can test your own Display.
 */
const Tester: React.FC<{
  testComponent: React.ComponentClass;
  mockAttachmentLoader?: PluginAttachmentLoader;
}> = props => {
  const {
    testComponent: TestComponent,
    mockAttachmentLoader = defaultAttachmentLoader
  } = props;
  const [consensual, setConsensual] = useState(false);
  const [editable, setEditable] = useState(true);

  const ctx = useMemo(() => {
    return {
      job: null as any,
      consensual,
      editable,
      loadAttachment: mockAttachmentLoader,
      eventLogger: () => {},
      rsHttpClient: null as any
    };
  }, [consensual, editable]);

  return (
    <CsResultsContext.Provider value={ctx}>
      <div>
        <TestComponent />
      </div>
    </CsResultsContext.Provider>
  );
};

export default Tester;
