import CsResultsContext, { PluginAttachmentLoader } from './CsResultsContext';
import React, { useState, useMemo } from 'react';

const defaultAttachmentLoader = async () => {
  return new Response();
};
defaultAttachmentLoader.list = () => Promise.resolve([]);

// STUB: Do not use this file

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
      plugin: null as any,
      consensual,
      editable,
      loadAttachment: mockAttachmentLoader,
      eventLogger: () => {},
      loadDisplay: null as any,
      UserDisplay: (
        props: React.PropsWithChildren<{
          userEmail: string;
        }>
      ) => <span title={props.userEmail}></span>
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
