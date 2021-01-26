import DataGrid, { DataGridColumnDefinition } from 'components/DataGrid';
import Icon from 'components/Icon';
import IconButton from 'components/IconButton';
import PatientInfoBox from 'components/PatientInfoBox';
import ProjectDisplay from 'components/ProjectDisplay';
import { Dropdown, DropdownButton, MenuItem } from 'components/react-bootstrap';
import SearchResultsView, {
  makeSortOptions
} from 'components/SearchResultsView';
import { PhysicalTag, TagList } from 'components/Tag';
import TimeDisplay from 'components/TimeDisplay';
import React, { Fragment, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import useLoginUser from 'utils/useLoginUser';
import * as s from 'store/searches';
import { useApi } from 'utils/api';

const Operation: React.FC<{
  value: any;
}> = props => {
  const item = props.value;
  return (
    <div className="register">
      <Link to={`/case/${item.caseId}`}>
        <IconButton icon="circus-case" bsSize="sm" bsStyle="primary">
          View
        </IconButton>
      </Link>
    </div>
  );
};

const Project: React.FC<{
  value: any;
}> = props => {
  const item = props.value;
  return <ProjectDisplay projectId={item.projectId} size="xl" withName />;
};

const CaseId: React.FC<{
  value: any;
}> = props => {
  const item = props.value;
  return <Fragment>{item.caseId.substr(0, 8)}</Fragment>;
};

const columns: DataGridColumnDefinition<any>[] = [
  { caption: 'Project', className: 'project', renderer: Project },
  { caption: 'Case ID', className: 'caseId', renderer: CaseId },
  {
    caption: 'Patient',
    className: 'patient',
    renderer: ({ value: { patientInfo } }) => {
      return <PatientInfoBox value={patientInfo} />;
    }
  },
  {
    caption: 'Create/Update',
    className: 'created-at',
    renderer: props => (
      <Fragment>
        <TimeDisplay value={props.value.createdAt} />
        <br />
        <TimeDisplay value={props.value.updatedAt} />
      </Fragment>
    )
  },
  {
    caption: 'Tags',
    className: 'tags',
    renderer: ({ value: item }) => {
      return <TagList tags={item.tags} projectId={item.projectId} />;
    }
  },
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
  projectId: 'project'
});

const TagSetEditor: React.FC<{
  onAction: (tag: string, isAdd: boolean) => void;
}> = props => {
  return <Dropdown.Toggle></Dropdown.Toggle>;
};

const CaseSearchResultsView: React.FC<{}> = props => {
  const search = useSelector(state => state.searches.searches.case);
  const items = useSelector(state => state.searches.items.cases);
  const selected = search?.selected ?? [];
  const { accessibleProjects } = useLoginUser()!;
  const api = useApi();
  const dispatch = useDispatch();

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
    await api('cases/tags', {
      method: 'patch',
      data: {
        operation: op === 'clear' ? 'set' : op,
        caseIds: selected,
        tags: op === 'clear' ? [] : [tag!]
      }
    });
    dispatch(s.updateSearch(api, 'case', {}));
  };

  return (
    <SearchResultsView
      sortOptions={sortOptions}
      dataView={DataView}
      refreshable
      name="case"
    >
      <DropdownButton
        id="case-menu-dropdown"
        bsSize="sm"
        disabled={selected.length === 0}
        title={
          <>
            <Icon icon="glyphicon-tag" />
            {selected.length > 0 && ` ${selected.length} selected`}
          </>
        }
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
    </SearchResultsView>
  );
};

export default CaseSearchResultsView;
