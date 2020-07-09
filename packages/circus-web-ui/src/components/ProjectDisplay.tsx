import React from 'react';
import IconDisplay from 'components/IconDisplay';
import useLoginUser from 'utils/useLoginUser';

const ProjectDisplay: React.FC<{
  projectId: string;
  withName: boolean;
  withDescription: boolean;
  [key: string]: any;
}> = props => {
  const { projectId, withName, withDescription, ...rest } = props;

  const user = useLoginUser()!;

  const project = user.accessibleProjects.find(p => p.projectId === projectId);
  if (!project) {
    throw new Error('Tried to render icon for an inaccessible project');
  }

  return (
    <IconDisplay
      toolTip={project.project.description}
      icon={project.project.icon}
      title={withName && project.project.projectName}
      description={withDescription && project.project.description}
      size="lg"
      {...rest}
    />
  );
};

export default ProjectDisplay;
