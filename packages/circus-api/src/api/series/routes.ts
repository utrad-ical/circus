import { defineRoute, defineRouteGroup } from '../../defineRoute.ts';
import { searchResult } from '../../schemas/derive.ts';
import {
  handleDelete,
  handleGet,
  handleGetExportCsVolume,
  handleGetOrientation,
  handlePost,
  handlePostSingle,
  handleSearch
} from './index.ts';
import { series, seriesOrientation } from '../../schemas/index.ts';

export const getSeries = defineRoute({
  verb: 'get',
  path: '/series',
  handler: handleSearch,
  description: 'Retrieves the list of DICOM series.',
  response: searchResult(series)
});

export const getSeriesListMyListId = defineRoute({
  verb: 'get',
  path: '/series/list/:myListId',
  handler: handleSearch,
  description: 'Performs search based on a my list ID.',
  response: searchResult(series)
});

export const postSeriesDomainDomain = defineRoute({
  verb: 'post',
  path: '/series/domain/:domain',
  handler: handlePost,
  description:
    'Uploads DICOM files, or zip/tar.gz archives of them, and imports them while receiving. Responds with the summary: 201 if all imported, 422 if some failed, 400 if none was a DICOM file. Pass `progressId` to report the progress.',
  expectedContentType: 'multipart/form-data'
});

export const postSeriesDomainDomainSingle = defineRoute({
  verb: 'post',
  path: '/series/domain/:domain/single',
  handler: handlePostSingle,
  description:
    'Same as `/series/domain/:domain`, with an empty 201 response for compatibility.',
  expectedContentType: 'multipart/form-data'
});

export const getSeriesExportCsVolume = defineRoute({
  verb: 'get',
  path: '/series/export-cs-volume',
  handler: handleGetExportCsVolume,
  description:
    'Exports the specified series as the input volumes of CIRCUS CS plug-ins in a zip or tar.gz archive. Must come before /series/:seriesUid. The query is validated by the handler with seriesExportCsVolumeQuery.',
  requiredGlobalPrivilege: 'downloadVolume'
});

export const getSeriesSeriesUid = defineRoute({
  verb: 'get',
  path: '/series/:seriesUid',
  handler: handleGet,
  description: 'Returns information about the specified series.'
});

export const getSeriesSeriesUidOrientation = defineRoute({
  verb: 'get',
  path: '/series/:seriesUid/orientation',
  handler: handleGetOrientation,
  description: 'Returns whether series is head-first or foot-first.',
  response: seriesOrientation
});

export const deleteSeriesSeriesUid = defineRoute({
  verb: 'delete',
  path: '/series/:seriesUid',
  handler: handleDelete,
  description: 'Deletes the specified series.'
});

export default defineRouteGroup({
  name: 'Series',
  description:
    'Operates DICOM series. This handles series information stored in the database. Actual image data (voxel values, window, etc.) are not contained.',
  routes: [
    getSeries,
    getSeriesListMyListId,
    postSeriesDomainDomain,
    postSeriesDomainDomainSingle,
    getSeriesExportCsVolume,
    getSeriesSeriesUid,
    getSeriesSeriesUidOrientation,
    deleteSeriesSeriesUid
  ]
});
