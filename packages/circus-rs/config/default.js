/*
 * CIRCUS RS default configuration file
 *
 * ** DO NOT EDIT THIS FILE DIRECTLY! **
 * Instead, do one of the followings:
 * - Add a file named `local.{json|json5|js}` in this directory
 * - Start the server with --config=<config-file-path>.
 */

'use strict';
var path = require('path');

module.exports.default = {
  // DICOM file repository is a loader that fetches the content of a DICOM file
  // specified by a series instance UID and an image number.
  dicomFileRepository: {
    type: 'StaticDicomFileRepository',
    options: {
      dataDir: '/var/dicom-data',
      useHash: false
    }
  },

  // Configuration specific to RS standalone server.
  rsServer: {
    options: {
      // Server port number to listen.
      port: 3000,
      // IP access control specified by regexp.
      // Permits accesses from all hosts by default.
      globalIpFilter: '.*',
      // Enables token-based, oauth2-compatible authorization for image requests.
      authorization: {
        // Main switch to enable token-based authorization
        enabled: false,
        // Optional IP filter used for granting requests.
        // Keep this as narrow as possible.
        tokenRequestIpFilter: '^127.0.0.1$',
        // Token expiration period.
        expire: 1800
      }
    }
  },

  // Logger configurations. By default, we make use of log4js library,
  // so see the documentation for that project.
  rsLogger: {
    type: 'FileLogger',
    options: {
      fileName: path.resolve(__dirname, '../logs/circus-rs')
    }
  },

  // DICOM loader
  dumper: {
    type: 'PureJsDicomDumper',
    options: {}
  },

  // Image encoder is used by some request types
  imageEncoder: {
    type: 'PngJsImageEncoder',
    options: {}
  },

  volumeProvider: {
    options: {
      // Controls how long the series data are kept in memory.
      cache: {
        // threshold: upper limit of heap memory size. (in bytes)
        memoryThreshold: 2147483648,
        // upper limit seconds of heap.
        maxAge: 3600
      }
    }
  }
};
