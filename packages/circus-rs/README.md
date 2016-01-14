CIRCUS RS: DICOM Server and Viewer
==================================

Requirements
------------

- gulp (for installation)
- mongoose (for CIRCUSDB_path_resolver, optional)
- node-png (for ImageEncoder_nodepng, optional)
- dicom_voxel_dump (for DicomVoxelDumperAdapter)

Build
-----

    # npm install
    # gulp

Test
----

Uses mocha. Tests are only partially written for now.

    # npm test

Alternatively, you can install mocha globally, which gives
more options.

    # npm install -g mocha
    # mocha

Configuration
-------------

All configuration data will go in `config/local.json` file.
Other environment-specific configuration files are supported; see
`node-config` package for more information.

- `pathResolver.module`: The module name for DICOM file path resolver.
- `pathResolver.options`: Additional data to pass to the path resolver. (See below)
- `dumper.module`: The module name for DICOM dumper module.
- `dumper.options`: Additional data to pass to DICOM dumper. (See below)
- `imageEncoder`: The module name for image export. (See below)
- `cache.memoryThreshold`:  upper limit of heap memory size in bytes.

### Path resolver configurations

#### StaticPathResolver

- `pathResolver.options.dataDir`: Full physical path for the stored DICOM series.
- `pathResolver.options.useHash`: Set true if your path for the stored DICOM series contains hash part.

#### CircusDbPathResolver
You need to install mongoose to use this. (See http://mongoosejs.com/docs/index.html)

- `pathResolver.options.configPath` to CIRCUS DB database config file's path.

### DICOM dumper configurations

#### DicomVoxelDumperAdapter:

- `dumper.options.dumper`: Full physical path and filename for dicom_voxel_dump.
- `dumper.options.bufferSize`: Buffer size of stdout buffer. Don't change until needed.

### ImageEncoder configuraions

#### ImageEncoder_pngjs

Default ImageEncoder using 'pngjs' (written in JavaScript only).

- `imageEncoder.options`: currently no options.

#### ImageEncoder_nodepng

Alternative PNG writer using 'png' (needs compile, faster than ImageEncoder_pngjs).
You need to install node-png to use this. (see https://github.com/pkrumins/node-png)

- `imageEncoder.options`: currently no options.


Authorization
-------------

If you want to restrict access to DICOM series image, you need to set `true` for config.authorization.require parameter.

Before accessing to any resource on the CIRCUS RS server, a client must fetch the access token by calling '/requestToken'. Then the client must add `Authorization` HTTP header for accessing sensitive resources.

And some optional parameters exist:

- `authorization.expire`: Life time of the token (in second, optional. default 1800). Each token's expiriration date will be updated automatically if a valid metadata/mpr/oblique/raw request occurred.
- `authorizaiton.allowFrom`: IP address from which a client can make a `requrestToken` request. Regular expressions are accepted. (optional. default '127.0.0.1')

Starting Server
---------------

    # node circus-rs.js

The use of `forever` or `nodemon` is strongly recommended.

Server API
----------

See [Server API document](SERVER-API.md).
