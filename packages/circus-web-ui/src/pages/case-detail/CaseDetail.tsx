import LoadingIndicator from '@smikitky/rb-components/lib/LoadingIndicator';
import { alert, confirm } from '@smikitky/rb-components/lib/modal';
import CaseExportModal from 'components/CaseExportModal';
import Collapser from 'components/Collapser';
import DataGrid, { DataGridColumnDefinition } from 'components/DataGrid';
import FullSpanContainer from 'components/FullSpanContainer';
import Icon from 'components/Icon';
import IconButton from 'components/IconButton';
import PatientInfoBox from 'components/PatientInfoBox';
import ProjectDisplay from 'components/ProjectDisplay';
import SearchResultsView from 'components/SearchResultsView';
import Tag from 'components/Tag';
import TimeDisplay from 'components/TimeDisplay';
import {
  Button,
  DropdownButton,
  Glyphicon,
  MenuItem,
  Modal
} from 'components/react-bootstrap';
import { produce } from 'immer';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState
} from 'react';
import { useDispatch } from 'react-redux';
import { Link, useBlocker, useParams } from 'react-router-dom';
import { showMessage } from 'store/messages';
import { newSearch } from 'store/searches';
import styled from 'styled-components';
import Series from 'types/Series';
import { useApi } from 'utils/api';
import useKeyboardShortcut from 'utils/useKeyboardShortcut';
import useLoginUser from 'utils/useLoginUser';
import { Project, Tags, Times } from '../search/SearchResultRenderer';
import RevisionEditor from './RevisionEditor';
import RevisionSelector from './RevisionSelector';
import SaveModal from './SaveModal';
import TagEditor from './TagEditor';
import caseStoreReducer, * as c from './caseStore';
import {
  EditingDataLayoutInitializer,
  EditingDataUpdater,
  externalRevisionToInternal,
  saveRevision
} from './revisionData';

const pageTransitionMessage = `Are you sure you want to leave?\nIf you leave before saving, your changes will be lost.`;

const CaseDetail: React.FC<{}> = () => {
  const caseId = useParams<{ caseId: string }>().caseId;
  const [caseStore, caseDispatch] = useReducer(
    caseStoreReducer,
    caseStoreReducer(undefined as any, { type: 'dummy' }) // gets initial state
  );
  const api = useApi();
  const dispatch = useDispatch();

  const { busy, caseData, seriesData, projectData, refreshCounter } = caseStore;
  const editingData = c.current(caseStore);

  const [tags, setTags] = useState<string[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [activeRelevantCases, setActiveRelevantCases] = useState(false);

  const user = useLoginUser();
  const accessibleProjects = useMemo(() => user.accessibleProjects, [user]);
  const isUpdated = caseStore.currentHistoryIndex > 0;

  useBlocker(({ currentLocation, nextLocation, historyAction }) => {
    if (isUpdated) {
      const ok = window.confirm(pageTransitionMessage);
      return !ok;
    }
    return false;
  });

  // warn before reloading or closing page with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.returnValue = () => true;
    };
    if (isUpdated) {
      window.addEventListener('beforeunload', handler);
    }
    return () => {
      window.removeEventListener('beforeunload', handler);
    };
  }, [isUpdated]);

  useEffect(() => {
    let isMounted = true;
    if (!caseId) {
      throw new Error('caseId is missing.');
    }
    const loadCase = async () => {
      const caseData = await api('cases/' + caseId);
      if (!isMounted) return;
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

      const viewPersonalInfoFlag = accessibleProjects
        .filter(p => p.roles.includes('viewPersonalInfo'))
        .some(p => p.projectId === caseData.projectId);
      const patientInfo = viewPersonalInfoFlag
        ? seriesData[latestRevision.series[0].seriesUid].patientInfo
        : undefined;
      patientInfo && setActiveRelevantCases(true);

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
    return () => {
      isMounted = false;
    };
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

  useEffect(() => {
    if (
      !activeRelevantCases ||
      !caseStore.patientInfo ||
      !caseStore.patientInfo.patientId
    )
      return;

    const filter = {
      'patientInfo.patientId': caseStore.patientInfo.patientId
    };

    dispatch(
      newSearch(api, 'relevantCases', {
        resource: { endPoint: 'cases', primaryKey: 'caseId' },
        filter,
        condition: {},
        sort: '{"updatedAt":-1}'
      })
    );
  }, [api, dispatch, caseStore.patientInfo, activeRelevantCases]);

  const updateEditingData = useCallback<EditingDataUpdater>(
    (updater, tag) => {
      const newData = produce(editingData, updater);
      caseDispatch(c.change({ newData, tag }));
    },
    [editingData]
  );

  const initEditingDataLayout = useCallback<EditingDataLayoutInitializer>(
    initializer => {
      const newData = produce(editingData, initializer);
      caseDispatch(c.initialLayoutDetermined(newData));
    },
    [editingData]
  );

  if (!caseId) {
    return null;
  }

  const handleRevisionSelect = async (index: number) => {
    if (isUpdated && !(await confirm(pageTransitionMessage))) return;
    caseDispatch(c.startLoadRevision({ revisionIndex: index }));
  };

  const handleTagChange = async (value: string[]) => {
    try {
      await api(`cases/${caseData!.caseId}/tags`, {
        method: 'put',
        data: value,
        handleErrors: true
      });
    } catch (err: any) {
      await alert('Error: ' + err.message);
    }
    setTags(value);
  };

  const handleSaveDialog = async (message: string) => {
    const revision = editingData.revision;
    setSaveDialogOpen(false);
    try {
      await saveRevision(caseId, revision, message, api);
      dispatch(
        showMessage('Successfully registered a revision.', 'success', {
          short: true
        })
      );
      const caseData = await api('cases/' + caseId);
      caseDispatch(
        c.loadRevisions({
          revisions: caseData.revisions,
          revisionIndex: caseData.revisions.length - 1
        })
      );
    } catch (err: any) {
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
        {activeRelevantCases ? (
          <DropdownButton
            id="casemenu"
            title={<PatientInfoBox value={caseStore.patientInfo} />}
            noCaret
            disabled={busy}
            style={{ textAlign: 'left', border: 'none', padding: '0px' }}
          >
            <RelevantCases currentCaseId={caseId} />
          </DropdownButton>
        ) : (
          <PatientInfoBox value={caseStore.patientInfo} />
        )}
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
        isUpdated={isUpdated}
        busy={busy}
      />
      <RevisionEditor
        busy={busy}
        caseDispatch={caseDispatch}
        editingData={editingData}
        seriesData={seriesData}
        projectData={projectData}
        refreshCounter={refreshCounter}
        initEditingDataLayout={initEditingDataLayout}
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
  isUpdated: boolean;
  busy: boolean;
}> = React.memo(props => {
  const { caseStore, onCommand, onRevisionSelect, isUpdated, busy } = props;
  const user = useLoginUser();

  useKeyboardShortcut('Ctrl+Z', () => {
    c.canUndo(caseStore) && onCommand('undo');
  });

  useKeyboardShortcut('Ctrl+Shift+Z', () => {
    c.canRedo(caseStore) && onCommand('redo');
  });

  useKeyboardShortcut('Ctrl+S', () => onCommand('save'));

  const unsavedAlertMessage = isUpdated ? (
    <>You have unsaved changes&nbsp;</>
  ) : null;

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
        {unsavedAlertMessage}
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

const RelevantCases: React.FC<{
  currentCaseId: string;
}> = props => {
  const { currentCaseId } = props;

  const RelevantCasesDataView: React.FC<any> = React.memo(props => {
    const { value } = props;
    const columns: DataGridColumnDefinition<any>[] = [
      { caption: 'Project', className: 'project', renderer: Project('xs') },
      {
        caption: 'Create/Update',
        className: 'created-at',
        renderer: Times()
      },
      { caption: 'Tags', className: 'tags', renderer: Tags },
      {
        key: 'action',
        caption: '',
        renderer: ({ value }) =>
          currentCaseId === value.caseId ? null : (
            <div className="register">
              <Link to={`/case/${value.caseId}`}>
                <IconButton icon="circus-case" bsSize="sm" bsStyle="primary">
                  View
                </IconButton>
              </Link>
            </div>
          )
      }
    ];
    return <DataGrid value={value} columns={columns} />;
  });

  return (
    <div style={{ whiteSpace: 'nowrap', margin: '1em' }}>
      <div>Showing cases from the same patient</div>
      <SearchResultsView
        name="relevantCases"
        dataView={RelevantCasesDataView}
      />
    </div>
  );
};
