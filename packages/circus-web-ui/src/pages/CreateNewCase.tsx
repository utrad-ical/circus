import u from '#components/utilities.module.css';
import Alert from '#components/Alert.tsx';
import Button from '#components/Button.tsx';
import Icon from '#components/Icon.tsx';
import MultiTagSelect from '#components/MultiTagSelect.tsx';
import ProjectSelector from '#components/ProjectSelector.tsx';
import type { SeriesEntry } from '#components/SeriesSelector.tsx';
import SeriesSelector from '#components/SeriesSelector.tsx';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '#utils/api.ts';
import useLoginUser from '#utils/useLoginUser.ts';

const CreateNewCase: React.FC<{}> = props => {
  const user = useLoginUser()!;
  const writableProjects = useMemo(
    () =>
      user.accessibleProjects.filter(
        p => p.roles.includes('write') && p.roles.includes('read')
      ),
    [user]
  );
  const [selectedProject, setSelectedProject] = useState(
    writableProjects[0] && writableProjects[0].projectId
  );
  const [selectedSeries, setSelectedSeries] = useState<SeriesEntry[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const seriesUid = useParams<any>().seriesUid as string;
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setSelectedSeries([{ seriesUid, partialVolumeDescriptor: 'auto' }]);
    };
    load();
  }, [seriesUid]);

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
        series: selectedSeries
      }
    });
    if (res.caseId) {
      navigate(`/case/${res.caseId}`);
    }
  };

  const canCreate = selectedSeries.length;

  if (!writableProjects.length) {
    return (
      <Alert variant="danger">You do not belong to any writable project.</Alert>
    );
  }

  const prj = writableProjects.find(p => p.projectId === selectedProject)!;
  const tags = prj.project.tags;

  return (
    <div>
      <h1>
        <Icon icon="circus-case" />
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
      <div className={u.textRight}>
        <Button
          disabled={!canCreate}
          icon="circus-case"
          variant="primary"
          onClick={handleCreate}
        >
          Create case for <b>{prj.project.projectName}</b>
        </Button>
      </div>
    </div>
  );
};

export default CreateNewCase;
