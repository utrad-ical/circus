requirement: 
node-png
https://github.com/pkrumins/node-png


for CIRCUSDB_path_resolver:
mongoose
https://www.npmjs.com/package/mongoose


configuration:
[config.js]
config.pathresolver : module name for DICOM file's path resolver.
config.dumper: path for DICOM dumper executable file.

path resolver:
[static_path_resolver]
edit static_path_resolver_config.js
change config.datadir to path for DICOM series stored.

[CIRCUSDB_path_resolver]
edit CIRCUSDB_path_resolver_config.js
change config.config_path to CIRCUS DB database config file's path.
but curently not worked.
TO BE FIXED.
