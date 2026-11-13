import u from '#components/utilities.module.css';
import Button from '#components/Button.tsx';
import { confirm } from '#components/dialogs.tsx';
import CaseExportModal from '#components/CaseExportModal.tsx';
import type { DataGridColumnDefinition } from '#components/DataGrid.tsx';
import DataGrid from '#components/DataGrid.tsx';
import Dialog from '#components/Dialog.tsx';
import DropdownButton from '#components/DropdownButton.tsx';
import Icon from '#components/Icon.tsx';
import MenuItem from '#components/MenuItem.tsx';
import MyListDropdown from '#components/MyListDropdown.tsx';
import SearchResultsView, {
  makeSortOptions,
  patientInfoSearchOptions
} from '#components/SearchResultsView.tsx';
import { PhysicalTag } from '#components/Tag.tsx';
import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import * as searches from '#store/searches.ts';
import { updateSearch } from '#store/searches.ts';
import { useApi } from '#utils/api.ts';
import useLoginUser from '#utils/useLoginUser.ts';
import {
  CaseId,
  PatientInfo,
  Project,
  Tags,
  Times
} from './SearchResultRenderer.tsx';

const Operation: React.FC<{
  value: any;
}> = props => {
  const item = props.value;
  const dispatch = useDispatch();
  const searchName =
    useLocation().pathname.indexOf('/browse/case/mylist') === 0
      ? 'myCaseList'
      : 'case';
  const search = useSelector(state => state.searches.searches[searchName]);
  const handleClick = () => {
    dispatch(searches.setNextPreviousList(search?.results?.indexes ?? []));
  };

  return (
    <div className="register">
      <Link to={`/case/${item.caseId}`}>
        <Button
          icon="circus-case"
          size="small"
          variant="primary"
          onClick={handleClick}
        >
          View
        </Button>
      </Link>
    </div>
  );
};

const columns: DataGridColumnDefinition<any>[] = [
  { caption: 'Project', className: 'project', renderer: Project() },
  { caption: 'Patient', className: 'patient', renderer: PatientInfo },
  { caption: 'Case ID', className: 'caseId', renderer: CaseId },
  { caption: 'Create/Update', className: 'created-at', renderer: Times() },
  { caption: 'Tags', className: 'tags', renderer: Tags },
  { caption: '', className: u.textRight, renderer: Operation }
];

const DataView: React.FC<{
  value: any[];
  selected: string[];
  onSelectionChange: (id: string, isSelected: boolean) => void;
}> = props => {
  const { value, selected, onSelectionChange } = props;

  return (
    <DataGrid
      className="case-search-result"
      itemPrimaryKey="caseId"
      columns={columns}
      value={value}
      itemSelectable={true}
      selectedItems={selected}
      onSelectionChange={onSelectionChange}
    />
  );
};

const sortOptions = makeSortOptions({
  createdAt: 'case create time',
  updatedAt: 'case updated time',
  projectId: 'project',
  ...patientInfoSearchOptions
});

const CaseSearchResultsView: React.FC<{
  searchName: string;
  refreshable?: boolean;
}> = props => {
  const { searchName, refreshable = true } = props;
  const search = useSelector(state => state.searches.searches[searchName]);
  const items = useSelector(state => state.searches.items.cases);
  const selected = useMemo(() => search?.selected ?? [], [search]);
  const { accessibleProjects } = useLoginUser()!;
  const api = useApi();
  const user = useLoginUser();
  const dispatch = useDispatch();
  const [showExportModal, setShowExportModal] = useState(false);

  const availableTags = useMemo(() => {
    const projectIds = Array.from(
      new Set(selected.map(caseId => items[caseId].projectId)).values()
    );
    return Array.from(
      new Map(
        projectIds
          .map(
            pid =>
              accessibleProjects.find(p => p.projectId === pid)!.project.tags
          )
          .flat(1)
          .map(tag => [tag.name, tag])
      ).values()
    );
  }, [accessibleProjects, items, selected]);

  const handleSetTags = async (
    op: 'add' | 'remove' | 'clear',
    tag?: string
  ) => {
    if (
      op === 'clear' &&
      !(await confirm('Do you really want to clear all tags?'))
    )
      return;
    await api('cases/tags', {
      method: 'patch',
      data: {
        operation: op === 'clear' ? 'set' : op,
        caseIds: selected,
        tags: op === 'clear' ? [] : [tag!]
      }
    });
    dispatch(updateSearch(api, searchName, {}));
  };

  const handleExportMhd = () => {
    if (!user.globalPrivileges.includes('downloadVolume')) return;
    setShowExportModal(true);
  };

  return (
    <SearchResultsView
      sortOptions={sortOptions}
      dataView={DataView}
      refreshable={refreshable}
      name={searchName}
    >
      {selected.length > 0 && (
        <>
          <DropdownButton
            id="case-tags-dropdown"
            size="small"
            title={<Icon icon="material-sell" />}
          >
            {availableTags.map(tag => {
              const count = selected.filter(
                cid => items[cid]!.tags.indexOf(tag.name) >= 0
              ).length;
              return (
                <MenuItem key={tag.name}>
                  <Button
                    size="xsmall"
                    icon="material-add"
                    onClick={() => handleSetTags('add', tag.name)}
                    disabled={count === selected.length}
                  />
                  &thinsp;
                  <Button
                    size="xsmall"
                    icon="material-close"
                    onClick={() => handleSetTags('remove', tag.name)}
                    disabled={count === 0}
                  />
                  &nbsp;
                  <PhysicalTag name={tag.name} color={tag.color} />
                </MenuItem>
              );
            })}
            <MenuItem onClick={() => handleSetTags('clear')}>
              Clear all tags
            </MenuItem>
          </DropdownButton>
          <MyListDropdown
            resourceType="clinicalCases"
            resourceIds={selected}
            searchName={searchName}
          />
          <DropdownButton
            id="case-export-dropdown"
            size="small"
            title={<Icon icon="material-more_horiz" />}
          >
            <MenuItem
              eventKey="mhd"
              onSelect={handleExportMhd}
              disabled={!user.globalPrivileges.includes('downloadVolume')}
            >
              Export as MHD
            </MenuItem>
          </DropdownButton>
        </>
      )}
      <Dialog open={showExportModal} dismissable={false} size="large">
        <CaseExportModal
          caseIds={selected}
          onClose={() => setShowExportModal(false)}
        />
      </Dialog>
      {selected.length > 0 && <> {selected.length} selected</>}
    </SearchResultsView>
  );
};

export default CaseSearchResultsView;
