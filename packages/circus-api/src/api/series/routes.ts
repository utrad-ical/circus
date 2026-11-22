import { defineRoute, defineRouteGroup, route } from '../../defineRoute.ts';
import { searchResultOf } from '../../schemas/derive.ts';
import {
  handleDelete,
  handleGet,
  handleGetExportCsVolume,
  handleGetOrientation,
  handlePost,
  handlePostSingle,
  handleSearch
} from './index.ts';
import {
  seriesForUser,
  seriesImportSummary,
  seriesOrientation
} from '@utrad-ical/circus-api-schema';

export const searchSeries = defineRoute({
  verb: 'get',
  path: '/series',
  description: 'Retrieves the list of DICOM series.',
  response: searchResultOf(seriesForUser)
});

export const searchSeriesInMyList = defineRoute({
  verb: 'get',
  path: '/series/list/:myListId',
  description: 'Performs search based on a my list ID.',
  response: searchResultOf(seriesForUser)
});

export const importSeries = defineRoute({
  verb: 'post',
  path: '/series/domain/:domain',
  description:
    'Uploads DICOM files, or zip/tar.gz archives of them, and imports them while receiving. Responds with the summary: 201 if all imported, 422 if some failed, 400 if none was a DICOM file. Pass `progressId` to report the progress.',
  expectedContentType: 'multipart/form-data',
  response: seriesImportSummary
});

export const importSeriesSingle = defineRoute({
  verb: 'post',
  path: '/series/domain/:domain/single',
  description:
    'Same as `/series/domain/:domain`, with an empty 201 response for compatibility.',
  expectedContentType: 'multipart/form-data',
  response: seriesImportSummary.nullable()
});

export const exportCsVolume = defineRoute({
  verb: 'get',
  path: '/series/export-cs-volume',
  description:
    'Exports the specified series as the input volumes of CIRCUS CS plug-ins in a zip or tar.gz archive. Must come before /series/:seriesUid. The query is validated by the handler with seriesExportCsVolumeQuery.',
  requiredGlobalPrivilege: 'downloadVolume'
});

export const getSeries = defineRoute({
  verb: 'get',
  path: '/series/:seriesUid',
  description: 'Returns information about the specified series.',
  response: seriesForUser
});

export const getSeriesOrientation = defineRoute({
  verb: 'get',
  path: '/series/:seriesUid/orientation',
  description: 'Returns whether series is head-first or foot-first.',
  response: seriesOrientation
});

export const deleteSeries = defineRoute({
  verb: 'delete',
  path: '/series/:seriesUid',
  description:
    'Deletes the specified series. Requires `manageServer` and access to the domain of the series.',
  requiredGlobalPrivilege: 'manageServer'
});

export default defineRouteGroup({
  name: 'Series',
  description:
    'Operates DICOM series. This handles series information stored in the database. Actual image data (voxel values, window, etc.) are not contained.',
  routes: [
    route(searchSeries, handleSearch),
    route(searchSeriesInMyList, handleSearch),
    route(importSeries, handlePost),
    route(importSeriesSingle, handlePostSingle),
    route(exportCsVolume, handleGetExportCsVolume),
    route(getSeries, handleGet),
    route(getSeriesOrientation, handleGetOrientation),
    route(deleteSeries, handleDelete)
  ]
});
