import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';
import { alert, confirm } from '@smikitky/rb-components/lib/modal';
import CaseExportModal from 'components/CaseExportModal';
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
  MenuItem,
  Modal
} from 'components/react-bootstrap';
import Tag from 'components/Tag';
import TimeDisplay from 'components/TimeDisplay';
import produce from 'immer';
import React, { useCallback, useEffect, useReducer, useState } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import Series from 'types/Series';
import { useApi } from 'utils/api';
import useKeyboardShortcut from 'utils/useKeyboardShortcut';
import useLoginUser from 'utils/useLoginUser';
import caseStoreReducer, * as c from './caseStore';
import {
  EditingDataUpdater,
  externalRevisionToInternal,
  saveRevision
} from './revisionData';
import RevisionEditor from './RevisionEditor';
import RevisionSelector from './RevisionSelector';
import SaveModal from './SaveModal';
import TagEditor from './TagEditor';

const CaseDetail: React.FC<{}> = props => {
  const caseId = useParams<any>().caseId;
  const [caseStore, caseDispatch] = useReducer(
    caseStoreReducer,
    caseStoreReducer(undefined as any, { type: 'dummy' }) // gets initial state
  );
  const api = useApi();

  const { busy, caseData, seriesData, projectData, refreshCounter } = caseStore;
  const editingData = c.current(caseStore);

  const [tags, setTags] = useState<string[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const user = useLoginUser();
  const accessibleProjects = user.accessibleProjects;

  useEffect(() => {
    const loadCase = async () => {
      const caseData = await api('cases/' + caseId);
      setTags(caseData.tags ?? []);
      const project = accessibleProjects.find(
        (p: { projectId: string }) => p.projectId === caseData.projectId
      );
      const latestRevision = caseData.revisions[caseData.revisions.length - 1];
      const seriesUids = Array.from(
        new Set(latestRevision.series.map((s: any) => s.seriesUid)).values()
      ) as string[]; // holds unique series uids
      const seriesData = Object.fromEntries(
        await Promise.all(
          seriesUids.map(async seriesUid => [
            seriesUid,
            await api('series/' + seriesUid)
          ])
        )
      ) as { [seriesUid: string]: Series };

      const patientInfo =
        seriesData[latestRevision.series[0].seriesUid].patientInfo;
      if (!project) {
        throw new Error('You do not have access to this project.');
      }
      caseDispatch(
        c.loadInitialCaseData({
          caseData,
          patientInfo,
          seriesData,
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

  const handleTagChange = async (value: string[]) => {
    try {
      await api(`cases/${caseData!.caseId}/tags`, {
        method: 'put',
        data: value,
        handleErrors: true
      });
    } catch (err) {
      await alert('Error: ' + err.message);
    }
    setTags(value);
  };

  const handleSaveDialog = async (message: string) => {
    const revision = editingData.revision;
    setSaveDialogOpen(false);
    try {
      await saveRevision(caseId, revision, message, api);
      await alert('Successfully registered a revision.');
      const caseData = await api('cases/' + caseId);
      caseDispatch(
        c.loadRevisions({
          revisions: caseData.revisions,
          revisionIndex: caseData.revisions.length - 1
        })
      );
    } catch (err) {
      await alert('Error: ' + err.message);
      throw err;
    }
  };

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
        setSaveDialogOpen(true);
        break;
      }
      case 'exportMhd': {
        if (!user.globalPrivileges.includes('downloadVolume')) return;
        setExportDialogOpen(true);
      }
    }
  };

  if (!caseData || !projectData || !seriesData || !editingData) {
    return busy ? <LoadingIndicator /> : null;
  }

  return (
    <FullSpanContainer>
      <CaseInfoCollapser title="Case Info">
        <PatientInfoBox value={caseStore.patientInfo} />
        <ProjectDisplay
          projectId={projectData.projectId}
          withName
          withDescription
          size="xl"
        />
        <div className="spacer" />
        <div className="tag-list">
          <b>Tags:</b>
          {tags.map((t: string | number | undefined) => (
            <Tag
              projectId={projectData.projectId}
              tag={!t ? '' : t.toString()}
              key={t}
            />
          ))}
          {tags.length === 0 && <span>(none)</span>}
          <TagEditor
            projectData={projectData}
            value={tags}
            onChange={handleTagChange}
          />
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
        seriesData={seriesData}
        projectData={projectData}
        refreshCounter={refreshCounter}
        updateEditingData={updateEditingData}
      />
      {exportDialogOpen && (
        <Modal show onHide={() => {}}>
          <CaseExportModal
            caseIds={[
              { caseId, revisionIndex: caseStore.editingRevisionIndex }
            ]}
            onClose={() => setExportDialogOpen(false)}
            revisions={caseStore.caseData!.revisions}
          />
        </Modal>
      )}
      {saveDialogOpen && (
        <Modal show onHide={() => {}}>
          <SaveModal
            value={editingData.revision.description}
            revisionHistory={
              caseStore.caseData ? caseStore.caseData.revisions : []
            }
            onHide={() => setSaveDialogOpen(false)}
            onOkClick={message => handleSaveDialog(message)}
          />
        </Modal>
      )}
    </FullSpanContainer>
  );
};

const CaseInfoCollapser = styled(Collapser)`
  .collapser-body {
    padding: 3px;
    display: flex;
    > * {
      margin: 0 10px;
    }
    flex-flow: row wrap;
    justify-content: space-between;
    align-items: center;
  }
  .spacer {
    flex-grow: 1;
  }
  .tag-list {
    > .tag {
      margin-left: 3px;
    }
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
  const user = useLoginUser();

  useKeyboardShortcut('Ctrl+Z', () => {
    c.canUndo(caseStore) && onCommand('undo');
  });

  useKeyboardShortcut('Ctrl+Shift+Z', () => {
    c.canRedo(caseStore) && onCommand('redo');
  });

  useKeyboardShortcut('Ctrl+S', () => onCommand('save'));

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
          disabled={
            busy ||
            !caseStore.caseAttributesAreValid ||
            caseStore.labelsWithInvalidAttributes.length > 0
          }
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
          <MenuItem
            disabled={!user.globalPrivileges.includes('downloadVolume')}
            onSelect={() => onCommand('exportMhd')}
          >
            <Icon icon="export" />
            Export as MHD
          </MenuItem>
        </DropdownButton>
      </div>
    </StyledMenuBarDiv>
  );
});

const StyledMenuBarDiv = styled.div`
  border-bottom: 1px solid ${(props: any) => props.theme.border};
  border-top: 1px solid ${(props: any) => props.theme.border};
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
