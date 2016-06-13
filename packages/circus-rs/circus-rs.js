/**
 * CIRCUS RS
 */

// Load configuration
var config = require('./build/server/Config');

// Execute server.
var Server = require('./build/server/Server');
(new Server(config)).start();
