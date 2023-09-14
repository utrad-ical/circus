import { confirm } from '@smikitky/rb-components/lib/modal';
import CaseExportModal from 'components/CaseExportModal';
import DataGrid, { DataGridColumnDefinition } from 'components/DataGrid';
import Icon from 'components/Icon';
import IconButton from 'components/IconButton';
import MyListDropdown from 'components/MyListDropdown';
import SearchResultsView, {
  makeSortOptions,
  patientInfoSearchOptions
} from 'components/SearchResultsView';
import { PhysicalTag } from 'components/Tag';
import { DropdownButton, MenuItem } from 'components/react-bootstrap';
import React, { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import * as searches from 'store/searches';
import { updateSearch } from 'store/searches';
import { useApi } from 'utils/api';
import useLoginUser from 'utils/useLoginUser';
import {
  CaseId,
  PatientInfo,
  Project,
  Tags,
  Times
} from './SearchResultRenderer';

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
        <IconButton
          icon="circus-case"
          bsSize="sm"
          bsStyle="primary"
          onClick={handleClick}
        >
          View
        </IconButton>
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
  { caption: '', className: 'operation', renderer: Operation }
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
  const selected = search?.selected ?? [];
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
            bsSize="sm"
            title={<Icon icon="glyphicon-tag" />}
          >
            {availableTags.map(tag => {
              const count = selected.filter(
                cid => items[cid]!.tags.indexOf(tag.name) >= 0
              ).length;
              return (
                <MenuItem key={tag.name}>
                  <IconButton
                    bsSize="xs"
                    bsStyle="default"
                    icon="glyphicon-plus"
                    onClick={() => handleSetTags('add', tag.name)}
                    disabled={count === selected.length}
                  />
                  &thinsp;
                  <IconButton
                    bsSize="xs"
                    bsStyle="default"
                    icon="glyphicon-remove"
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
            bsSize="sm"
            title={<Icon icon="glyphicon-option-horizontal" />}
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
      {showExportModal && (
        <CaseExportModal
          caseIds={selected}
          onClose={() => setShowExportModal(false)}
        />
      )}
      {selected.length > 0 && <> {selected.length} selected</>}
    </SearchResultsView>
  );
};

export default CaseSearchResultsView;
