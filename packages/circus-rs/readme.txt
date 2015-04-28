requirement: 
gulp (for installation)
mongoose (for CIRCUSDB_path_resolver)

installation:
# npm install
# npm install mongoose
# gulp

configuration:
[config.js]
config.pathresolver : module name for DICOM file's path resolver.
config.dumper: path for DICOM dumper executable file.

path resolver configuration:
[static_path_resolver]
edit static_path_resolver_config.js
change config.datadir to path for DICOM series stored.

[CIRCUSDB_path_resolver]
edit CIRCUSDB_path_resolver_config.js
change config.config_path to CIRCUS DB database config file's path.

start server:
# node circus-rs.js
