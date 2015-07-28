/**
 * Register access token.
 *
 * series: DICOM series instance UID
 * token: access token
 *
 * also in metadata/mpr/oblique... request.
 */
import Controller from './Controller';
import http = require('http');
import AuthorizationCache from '../AuthorizationCache';

export default class RegisterAccessTokenAction extends Controller {
    private cache: AuthorizationCache;

    public setCache(cache: AuthorizationCache) : void
    {
        this.cache = cache;
    }

    public process(query: any, res: http.ServerResponse): void
    {
        var series: string;
        var token: string;

        if ('series' in query) {
            series = query['series'];
        }
        if ('token' in query) {
            token = query['token'];
        }
        if (series == null || token == null) {
            this.respondBadRequest(res, 'No series nor token in query');
            return;
        }

        this.cache.update(series, token);

        var status = {
            'result': 'ok'
        };

        this.respondJson(res, status);
    }

}
