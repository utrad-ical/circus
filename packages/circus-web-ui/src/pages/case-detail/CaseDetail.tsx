import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';
import { alert, confirm, prompt } from '@smikitky/rb-components/lib/modal';
import Collapser from 'components/Collapser';
import FullSpanContainer from 'components/FullSpanContainer';
import Icon from 'components/Icon';
import IconButton from 'components/IconButton';
import PatientInfoBox from 'components/PatientInfoBox';
import ProjectDisplay from 'components/ProjectDisplay';
import {
  Button,
  DropdownButton,
  Glyphicon,
  MenuItem
} from 'components/react-bootstrap';
import Tag from 'components/Tag';
import TimeDisplay from 'components/TimeDisplay';
import React, { useCallback, useEffect, useReducer } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { useApi } from 'utils/api';
import caseStoreReducer, * as c from './caseStore';
import {
  EditingData,
  ExternalLabel,
  externalRevisionToInternal,
  Revision,
  saveRevision
} from './revisionData';
import RevisionEditor from './RevisionEditor';
import RevisionSelector from './RevisionSelector';

const CaseDetail: React.FC<{}> = props => {
  const caseId = useParams<any>().caseId;
  const [caseStore, caseDispatch] = useReducer(
    caseStoreReducer,
    caseStoreReducer(undefined as any, { type: 'dummy' }) // gets initial state
  );
  const api = useApi();

  const { busy, caseData, projectData, editingRevisionIndex } = caseStore;
  const editingData = c.current(caseStore);

  const accessibleProjects = useSelector(
    state => state.loginUser.data!.accessibleProjects
  );

  const loadRevisionData = async (
    revisions: Revision<ExternalLabel>[],
    index: number
  ) => {
    const revision = revisions[index];
    caseDispatch(c.setBusy(true));
    // Loads actual volume data and adds label temporary key.
    const data = await externalRevisionToInternal(revision, api);
    caseDispatch(c.startEditing({ revision: data, revisionIndex: index }));
    caseDispatch(c.setBusy(false));
  };

  const loadCase = async () => {
    const caseData = await api('cases/' + caseId);
    const project = accessibleProjects.find(
      (p: { projectId: string }) => p.projectId === caseData.projectId
    );
    if (!project) {
      throw new Error('You do not have access to this project.');
    }
    caseDispatch(c.loadCaseData({ caseData, projectData: project.project }));
    await loadRevisionData(caseData.revisions, caseData.revisions.length - 1);
  };

  useEffect(() => {
    loadCase();
    // eslint-disable-next-line
  }, []);

  const handleRevisionSelect = async (index: number) => {
    await loadRevisionData(caseData.revisions, index);
  };

  const handleDataChange = useCallback(
    (newData: EditingData, pushToHistory: any = false) => {
      caseDispatch(c.change({ newData, pushToHistory }));
    },
    []
  );

  const handleMenuBarCommand = async (command: MenuBarCommand) => {
    switch (command) {
      case 'undo':
        caseDispatch(c.undo());
        break;
      case 'redo':
        caseDispatch(c.redo());
        break;
      case 'revert': {
        if (!(await confirm('Reload the current revision?'))) {
          return;
        }
        loadRevisionData(caseData.revisions, editingRevisionIndex);
        break;
      }
      case 'save': {
        if (!editingData) return;
        const revision = editingData.revision;
        const desc = await prompt('Revision message', revision.description);
        if (desc === null) return;
        try {
          await saveRevision(caseId, revision, desc, api);
          await alert('Successfully registered a revision.');
          // For now, perform a full case reload.
          // TODO: Optimize this
          loadCase();
        } catch (err) {
          await alert('Error: ' + err.message);
          throw err;
        }
        break;
      }
      case 'exportMhd': {
        const blob = await api(`cases/${caseId}/export-mhd`, {
          responseType: 'blob'
        });
        const a = document.createElement('a');
        document.body.appendChild(a);
        const url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = 'export.zip';
        a.click();
        window.URL.revokeObjectURL(url);
        break;
      }
    }
  };

  if (!caseData || !projectData || !editingData) {
    return busy ? <LoadingIndicator /> : null;
  }

  return (
    <FullSpanContainer>
      <Collapser title="Case Info" className="case-info">
        <ProjectDisplay
          projectId={projectData.projectId}
          withName
          withDescription
          size="xl"
        />
        <PatientInfoBox value={caseData.patientInfoCache} />
        <div className="tag-list">
          {caseData.tags.map((t: string | number | undefined) => (
            <Tag
              projectId={projectData.projectId}
              tag={!t ? '' : t.toString()}
              key={t}
            />
          ))}
        </div>
        <div>
          Case: {caseId}
          <br />
          (Create: <TimeDisplay value={caseData.createdAt} />)
        </div>
      </Collapser>
      <MenuBar
        caseStore={caseStore}
        onCommand={handleMenuBarCommand}
        onRevisionSelect={handleRevisionSelect}
      />
      <RevisionEditor
        key={editingRevisionIndex}
        busy={busy}
        editingData={editingData}
        projectData={projectData}
        onChange={handleDataChange}
      />
    </FullSpanContainer>
  );
};

export default CaseDetail;

type MenuBarCommand = 'undo' | 'redo' | 'revert' | 'save' | 'exportMhd';

const MenuBar: React.FC<{
  caseStore: c.CaseDetailState;
  onCommand: (command: MenuBarCommand) => void;
  onRevisionSelect: (index: number) => Promise<void>;
}> = props => {
  const { caseStore, onCommand, onRevisionSelect } = props;
  return (
    <div className="case-detail-menu">
      <div className="left">
        Revision:&ensp;
        <RevisionSelector
          revisions={caseStore.caseData.revisions}
          selected={caseStore.editingRevisionIndex}
          onSelect={onRevisionSelect}
        />
      </div>
      <div className="right">
        <IconButton
          bsStyle="default"
          icon="step-backward"
          disabled={!c.canUndo(caseStore)}
          onClick={() => onCommand('undo')}
        />
        <IconButton
          bsStyle="default"
          icon="step-forward"
          disabled={!c.canRedo(caseStore)}
          onClick={() => onCommand('redo')}
        />
        &ensp;
        <Button bsStyle="success" onClick={() => onCommand('save')}>
          <Glyphicon glyph="save" />
          Save
        </Button>
        <DropdownButton
          id="submenu"
          bsStyle="link"
          title={<Icon icon="menu-hamburger" />}
          pullRight
          noCaret
        >
          <MenuItem eventKey="1" onSelect={() => onCommand('revert')}>
            <Icon icon="remove" />
            &ensp;Revert
          </MenuItem>
          <MenuItem divider />
          <MenuItem header>Export</MenuItem>
          <MenuItem onSelect={() => onCommand('exportMhd')}>
            <Icon icon="export" />
            Export as MHD
          </MenuItem>
        </DropdownButton>
      </div>
    </div>
  );
};
