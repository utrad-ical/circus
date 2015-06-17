CIRCUS RS: DICOM Server and Viewer
==================================

Requirements
------------

- gulp (for installation)
- mongoose (for CIRCUSDB_path_resolver)

Installation
------------

    # npm install
    # npm install mongoose
    # gulp

Configuration
-------------

[config.js]

config.pathresolver : module name for DICOM file's path resolver.
config.dumper: path for DICOM dumper executable file.

Path resolver configurations:

[static_path_resolver]
edit static_path_resolver_config.js
change config.datadir to path for DICOM series stored.

[CIRCUSDB_path_resolver]

edit CIRCUSDB_path_resolver_config.js

change config.config_path to CIRCUS DB database config file's path.

Start server
------------

    # node circus-rs.js
