/**
 * CIRCUS RS
 */

var config = require('config');

var Server = require('./build/server/Server');
(new Server(config)).start();
