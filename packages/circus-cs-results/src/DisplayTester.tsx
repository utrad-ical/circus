import CsResultsContext, { PluginAttachmentLoader } from 'CsResultsContext';
import React, { useState, useMemo } from 'react';

const defaultAttachmentLoader = async () => {
  return new Response('"Example response"');
};

/**
 * This is a utility component with which you can test your own Display.
 */
const DisplayTester: React.FC<{
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
      eventLogger: () => {},
      loadAttachment: mockAttachmentLoader,
      rsHttpClient: null as any
    };
  }, [consensual, editable]);

  return (
    <CsResultsContext.Provider value={ctx}>
      <div>
        hoge
        <TestComponent />
      </div>
    </CsResultsContext.Provider>
  );
};

export default DisplayTester;
