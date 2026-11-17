import { defineRoute, defineRouteGroup, route } from '../../defineRoute.ts';
import { allRequiredExcept, searchResult } from '../../schemas/derive.ts';
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
  clinicalCaseSearchResult,
  revision
} from '../../schemas/index.ts';

export const getCases = defineRoute({
  verb: 'get',
  path: '/cases',
  description: 'Performs search and retrieves a list of cases.',
  response: searchResult(clinicalCaseSearchResult)
});

export const getCasesListMyListId = defineRoute({
  verb: 'get',
  path: '/cases/list/:myListId',
  description: 'Peforms search based on a my list ID.',
  response: searchResult(clinicalCaseSearchResult)
});

export const postCases = defineRoute({
  verb: 'post',
  path: '/cases',
  description: 'Creates a new case.',
  request: clinicalCaseCreate
});

export const getCasesExportMhd = defineRoute({
  verb: 'get',
  path: '/cases/export-mhd',
  description:
    'Exports the specified cases as MHD in a zip or tar.gz archive. Must come before /cases/:caseId. The query is validated by the handler with caseExportMhdQuery.',
  requiredGlobalPrivilege: 'downloadVolume'
});

export const getCasesCaseId = defineRoute({
  verb: 'get',
  path: '/cases/:caseId',
  description: 'Returns information about the specified case.',
  requiredProjectPrivilege: 'read'
});

export const postCasesCaseIdRevision = defineRoute({
  verb: 'post',
  path: '/cases/:caseId/revision',
  description: 'Creates a new revision in the specified case.',
  requiredProjectPrivilege: 'write',
  request: allRequiredExcept(revision, ['date', 'creator'])
});

export const putCasesCaseIdTags = defineRoute({
  verb: 'put',
  path: '/cases/:caseId/tags',
  description: 'Updates the tags of the specified case.',
  requiredProjectPrivilege: 'write',
  request: caseTags
});

export const patchCasesTags = defineRoute({
  verb: 'patch',
  path: '/cases/tags',
  description: 'Manages the tags of multiple cases.',
  request: caseTagsPatch
});

export const deleteCasesCaseId = defineRoute({
  verb: 'delete',
  path: '/cases/:caseId',
  description: 'Deletes the specified case.',
  requiredProjectPrivilege: 'moderate'
});

export default defineRouteGroup({
  name: 'Cases',
  description: 'Manages CIRCUS DB cases.',
  routes: [
    route(getCases, handleSearch),
    route(getCasesListMyListId, handleSearch),
    route(postCases, handlePost),
    route(getCasesExportMhd, handleGetExportMhd),
    route(getCasesCaseId, handleGet),
    route(postCasesCaseIdRevision, handlePostRevision),
    route(putCasesCaseIdTags, handlePutTags),
    route(patchCasesTags, handlePatchTags),
    route(deleteCasesCaseId, handleDelete)
  ]
});
