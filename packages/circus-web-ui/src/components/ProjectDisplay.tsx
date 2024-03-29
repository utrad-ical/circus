import React from 'react';
import IconDisplay from 'components/IconDisplay';
import useLoginUser from 'utils/useLoginUser';

const ProjectDisplay: React.FC<{
  projectId: string;
  withName: boolean;
  withDescription?: boolean;
  size?: string;
  [key: string]: any;
}> = props => {
  const { projectId, withName, withDescription, size = 'lg', ...rest } = props;

  const user = useLoginUser()!;

  const project = user.accessibleProjects.find(p => p.projectId === projectId);
  if (!project) {
    throw new Error('Tried to render icon for an inaccessible project');
  }

  return (
    <IconDisplay
      toolTip={withDescription ? undefined : project.project.description}
      icon={project.project.icon}
      title={withName && project.project.projectName}
      description={withDescription && project.project.description}
      size={size}
      {...rest}
    />
  );
};

export default ProjectDisplay;
