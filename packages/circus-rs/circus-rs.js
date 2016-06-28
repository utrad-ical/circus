/**
 * CIRCUS RS
 */

// Load configuration
var config = require('./lib/server/Config');

// Execute server.
var Server = require('./lib/server/Server');
(new Server(config)).start();
