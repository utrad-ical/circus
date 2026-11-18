import { z } from 'zod';
import { defineRoute, defineRouteGroup, route } from '../../defineRoute.ts';
import { searchResultOf } from '../../schemas/derive.ts';
import {
  handleDelete,
  handleGet,
  handleGetExportMhd,
  handlePatchTags,
  handlePost,
  handlePostRevision,
  handlePutTags,
  handleSearch
} from './index.ts';
import {
  caseTags,
  caseTagsPatch,
  clinicalCaseCreate,
  caseDetail,
  caseSearchResult,
  revisionCreate
} from '@utrad-ical/circus-api-schema';

export const searchCases = defineRoute({
  verb: 'get',
  path: '/cases',
  description: 'Performs search and retrieves a list of cases.',
  response: searchResultOf(caseSearchResult)
});

export const searchCasesInMyList = defineRoute({
  verb: 'get',
  path: '/cases/list/:myListId',
  description: 'Peforms search based on a my list ID.',
  response: searchResultOf(caseSearchResult)
});

export const postCase = defineRoute({
  verb: 'post',
  path: '/cases',
  description: 'Creates a new case.',
  request: clinicalCaseCreate,
  response: z.strictObject({ caseId: z.string() })
});

export const exportMhd = defineRoute({
  verb: 'get',
  path: '/cases/export-mhd',
  description:
    'Exports the specified cases as MHD in a zip or tar.gz archive. Must come before /cases/:caseId. The query is validated by the handler with caseExportMhdQuery.',
  requiredGlobalPrivilege: 'downloadVolume'
});

export const getCase = defineRoute({
  verb: 'get',
  path: '/cases/:caseId',
  description: 'Returns information about the specified case.',
  requiredProjectPrivilege: 'read',
  response: caseDetail
});

export const postRevision = defineRoute({
  verb: 'post',
  path: '/cases/:caseId/revision',
  description: 'Creates a new revision in the specified case.',
  requiredProjectPrivilege: 'write',
  request: revisionCreate
});

export const putTags = defineRoute({
  verb: 'put',
  path: '/cases/:caseId/tags',
  description: 'Updates the tags of the specified case.',
  requiredProjectPrivilege: 'write',
  request: caseTags
});

export const patchTags = defineRoute({
  verb: 'patch',
  path: '/cases/tags',
  description: 'Manages the tags of multiple cases.',
  request: caseTagsPatch
});

export const deleteCase = defineRoute({
  verb: 'delete',
  path: '/cases/:caseId',
  description: 'Deletes the specified case.',
  requiredProjectPrivilege: 'moderate'
});

export default defineRouteGroup({
  name: 'Cases',
  description: 'Manages CIRCUS DB cases.',
  routes: [
    route(searchCases, handleSearch),
    route(searchCasesInMyList, handleSearch),
    route(postCase, handlePost),
    route(exportMhd, handleGetExportMhd),
    route(getCase, handleGet),
    route(postRevision, handlePostRevision),
    route(putTags, handlePutTags),
    route(patchTags, handlePatchTags),
    route(deleteCase, handleDelete)
  ]
});
