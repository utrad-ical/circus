CIRCUS RS: DICOM Server and Viewer
==================================

Requirements
------------

- gulp (for installation)
- mongoose (for CIRCUSDB_path_resolver)

Build
-----

    # npm install
    # npm install mongoose
    # gulp

Configuration
-------------

All configuration data will go in `config.js` file.

- `pathResolver.module`: The module name for DICOM file path resolver.
- `pathResolver.options`: Additional data to pass to the path resolver. (See below)
- `dumper`: path for DICOM dumper executable file.

Path resolver configurations:

### StaticPathResolver

- `pathResolver.options.dataDir`: Full physical path for the stored DICOM series.

### CircusDbPathResolver

- `pathResolver.options.configPath` to CIRCUS DB database config file's path.

Start server
------------

    # node build/circus-rs.js
