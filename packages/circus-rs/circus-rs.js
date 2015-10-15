/**
 * CIRCUS RS
 */

var config = require('config');

var Server = require('./build/Server');
(new Server(config)).start();