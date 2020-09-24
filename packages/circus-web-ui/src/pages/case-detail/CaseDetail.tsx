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
import produce from 'immer';
import React, { useCallback, useEffect, useReducer } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { useApi } from 'utils/api';
import caseStoreReducer, * as c from './caseStore';
import {
  EditingDataUpdater,
  externalRevisionToInternal,
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

  const { busy, caseData, projectData } = caseStore;
  const editingData = c.current(caseStore);

  const accessibleProjects = useSelector(
    state => state.loginUser.data!.accessibleProjects
  );

  useEffect(() => {
    const loadCase = async () => {
      const caseData = await api('cases/' + caseId);
      const project = accessibleProjects.find(
        (p: { projectId: string }) => p.projectId === caseData.projectId
      );
      const seriesUid =
        caseData.revisions[caseData.revisions.length - 1].series[0].seriesUid;
      const firstSeries = await api('series/' + seriesUid);
      const patientInfo = firstSeries.patientInfo;
      if (!project) {
        throw new Error('You do not have access to this project.');
      }
      caseDispatch(
        c.loadInitialCaseData({
          caseData,
          patientInfo,
          projectData: project.project
        })
      );
      caseDispatch(
        c.startLoadRevision({ revisionIndex: caseData.revisions.length - 1 })
      );
    };
    loadCase();
  }, [accessibleProjects, api, caseId]); // should not re-render after mount

  const [f, forceLoadRevision] = useReducer(x => x + 1, 0);
  useEffect(() => {
    caseDispatch(c.setBusy(true));
    const loadRevisionData = async () => {
      if (!caseStore.caseData || caseStore.editingRevisionIndex < 0) return;
      const revision =
        caseStore.caseData.revisions[caseStore.editingRevisionIndex];
      const data = await externalRevisionToInternal(revision, api);
      caseDispatch(c.loadRevision({ revision: data }));
    };
    loadRevisionData();
  }, [api, caseStore.caseData, caseStore.editingRevisionIndex, f]);

  const handleRevisionSelect = async (index: number) => {
    caseDispatch(c.startLoadRevision({ revisionIndex: index }));
  };

  const updateEditingData = useCallback<EditingDataUpdater>(
    (updater, tag) => {
      const newData = produce(editingData, updater);
      caseDispatch(c.change({ newData, tag }));
    },
    [editingData]
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
        forceLoadRevision();
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
          const caseData = await api('cases/' + caseId);
          caseDispatch(c.loadRevisions(caseData.revisions));
          caseDispatch(
            c.startLoadRevision({
              revisionIndex: caseData.revisions.length - 1
            })
          );
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
      <CaseInfoCollapser title="Case Info">
        <ProjectDisplay
          projectId={projectData.projectId}
          withName
          withDescription
          size="xl"
        />
        <PatientInfoBox value={caseStore.patientInfo} />
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
      </CaseInfoCollapser>
      <MenuBar
        caseStore={caseStore}
        onCommand={handleMenuBarCommand}
        onRevisionSelect={handleRevisionSelect}
        busy={busy}
      />
      <RevisionEditor
        busy={busy}
        caseDispatch={caseDispatch}
        editingData={editingData}
        projectData={projectData}
        updateEditingData={updateEditingData}
      />
    </FullSpanContainer>
  );
};

const CaseInfoCollapser = styled(Collapser)`
  .collapser-body {
    padding: 3px;
    display: flex;
    flex-flow: row wrap;
    justify-content: space-between;
    align-items: center;
  }
`;

export default CaseDetail;

type MenuBarCommand = 'undo' | 'redo' | 'revert' | 'save' | 'exportMhd';

const MenuBar: React.FC<{
  caseStore: c.CaseDetailState;
  onCommand: (command: MenuBarCommand) => void;
  onRevisionSelect: (index: number) => Promise<void>;
  busy: boolean;
}> = React.memo(props => {
  const { caseStore, onCommand, onRevisionSelect, busy } = props;
  return (
    <StyledMenuBarDiv>
      <div className="left">
        Revision:&ensp;
        <RevisionSelector
          revisions={caseStore.caseData!.revisions}
          selected={caseStore.editingRevisionIndex}
          onSelect={onRevisionSelect}
          disabled={busy}
        />
        {busy && (
          <>
            &ensp;
            <LoadingIndicator delay={500} />
          </>
        )}
      </div>
      <div className="right">
        <IconButton
          bsStyle="default"
          icon="step-backward"
          disabled={!c.canUndo(caseStore) || busy}
          onClick={() => onCommand('undo')}
        />
        <IconButton
          bsStyle="default"
          icon="step-forward"
          disabled={!c.canRedo(caseStore) || busy}
          onClick={() => onCommand('redo')}
        />
        &ensp;
        <Button
          bsStyle="success"
          onClick={() => onCommand('save')}
          disabled={busy}
        >
          <Glyphicon glyph="save" />
          Save
        </Button>
        <DropdownButton
          id="submenu"
          bsStyle="link"
          title={<Icon icon="menu-hamburger" />}
          pullRight
          noCaret
          disabled={busy}
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
    </StyledMenuBarDiv>
  );
});

const StyledMenuBarDiv = styled.div`
  border-bottom: 1px solid silver;
  border-top: 1px solid silver;
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
  flex: none;
  .left {
    padding: 3px;
  }
  .right {
    flex: 1000;
    text-align: right;
    padding: 3px;
  }
`;
