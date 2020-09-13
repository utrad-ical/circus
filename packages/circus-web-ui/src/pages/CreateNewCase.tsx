import browserHistory from 'browserHistory';
import IconButton from 'components/IconButton';
import MultiTagSelect from 'components/MultiTagSelect';
import ProjectSelector from 'components/ProjectSelector';
import SeriesSelector, { SeriesEntry } from 'components/SeriesSelector';
import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { useApi } from 'utils/api';
import fillPartialVolumeDescriptors from 'utils/partialVolumeDescriptor';
import useLoginUser from 'utils/useLoginUser';

const CreateNewCase: React.FC<{}> = props => {
  const user = useLoginUser()!;
  const writableProjects = useMemo(
    () => user.accessibleProjects.filter(p => p.roles.indexOf('write') >= 0),
    [user]
  );
  const [selectedProject, setSelectedProject] = useState(
    writableProjects[0].projectId
  );
  const [selectedSeries, setSelectedSeries] = useState<SeriesEntry[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const api = useApi();
  const appState = useSelector(state => state);
  const seriesUid = useParams<any>().seriesUid as string;

  useEffect(() => {
    const load = async () => {
      setSelectedSeries([{ seriesUid, partialVolumeDescriptor: undefined }]);
    };
    load();
  }, [api, seriesUid]);

  const handleProjectSelect = (projectId: string) => {
    const prj = user.accessibleProjects.find(p => p.projectId === projectId)!;
    const newTags = selectedTags.filter(t =>
      prj.project.tags.find(tt => tt.name === t)
    );
    setSelectedProject(projectId);
    setSelectedTags(newTags);
  };

  const handleCreate = async () => {
    const res = await api('cases', {
      method: 'post',
      data: {
        projectId: selectedProject,
        tags: selectedTags,
        series: await fillPartialVolumeDescriptors(
          selectedSeries,
          api,
          appState
        )
      }
    });
    if (res.caseId) {
      browserHistory.push(`/case/${res.caseId}`);
    }
  };

  const canCreate = selectedSeries.length;

  if (!writableProjects.length) {
    return (
      <div className="alert alert-danger">
        You do not belong to any writable project.
      </div>
    );
  }

  const prj = writableProjects.find(p => p.projectId === selectedProject)!;
  const tags = prj.project.tags;

  return (
    <div>
      <h1>
        <span className="circus-icon-case" />
        New Case
      </h1>
      <SeriesSelector value={selectedSeries} onChange={setSelectedSeries} />
      <div>
        Project:&ensp;
        <ProjectSelector
          projects={writableProjects}
          value={selectedProject}
          onChange={handleProjectSelect}
        />
        &ensp; Tags:&ensp;
        <MultiTagSelect
          tags={tags}
          value={selectedTags}
          onChange={setSelectedTags}
        />
      </div>
      <div className="text-right">
        <IconButton
          disabled={!canCreate}
          icon="circus-case"
          bsStyle="primary"
          onClick={handleCreate}
        >
          Create case for <b>{prj.project.projectName}</b>
        </IconButton>
      </div>
    </div>
  );
};

export default CreateNewCase;
