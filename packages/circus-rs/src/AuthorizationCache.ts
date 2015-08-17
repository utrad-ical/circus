/**
 * Created by nfujita on 2015/07/28.
 */

import http = require('http');
var url = require('url');
import logger from './Logger';

interface AuthorizationInfo {
    [token: string]: Date;
}

export default class AuthorizationCache {
    private config: any;
    private cache: AuthorizationInfo = {};

    constructor(config: any) {
        this.config = config || {};

        setInterval(() => {
            var date: Date = new Date();

            for (var x in this.cache) {
                var limit : Date  = this.cache[x];
                if (limit.getTime() <= date.getTime()) {
                    delete this.cache[x];
                }
            }

        }, 3600*1000);

    }

    /**
     * update token lifetime.
     *
     * @param series DICOM series instance UID
     * @param token any strings to identify client.
     */
    public update(series: string, token:string) : void {
        var currentDate: Date = new Date();
        currentDate.setTime(currentDate.getTime() + this.config.expire * 1000);
        this.cache[token + '_' + series] = currentDate;
    }

    /**
     * validate query string if access is allowed.
     *
     * @param req HTTP request. 'series' query parameter and X-CircusRs-AccessToken http header needed.
     * @returns {boolean}
     */
    public isValid(req: http.ServerRequest) : boolean {
        var query = url.parse(req.url, true).query;
        var token: string;
        var series: string;

        if ('series' in query) {
            series = query['series'];
            logger.debug('series=' + series);
        }
        if ('X-CircusRs-AccessToken' in req.headers) {
            token = req.headers['X-CircusRs-AccessToken'];
            logger.debug('token=' + token);
        }
        if (series == null || token == null) {
            logger.debug('series nor token is null');
            return false;
        }

        var key : string = token + '_' + series;
        var current : Date = new Date();
        var date : Date = this.cache[key];

        logger.debug('current: ' + current);
        logger.debug('target : ' + date);
        if (date == null) {
            logger.debug('token not found');
            return false;
        }

        if (new Date().getTime() <= date.getTime()) {
            this.update(series, token);
            return true;
        }
        logger.debug('token expired');
        delete this.cache[key];
        return false;
    }

}