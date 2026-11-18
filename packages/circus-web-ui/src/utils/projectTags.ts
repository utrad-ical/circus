import type { Project } from '@utrad-ical/circus-api-schema';

type ProjectTag = Project['tags'][number];
export type NamedProjectTag = ProjectTag & { name: string };

export const namedProjectTags = (tags: ProjectTag[]): NamedProjectTag[] =>
  tags.filter((tag): tag is NamedProjectTag => typeof tag.name === 'string');
