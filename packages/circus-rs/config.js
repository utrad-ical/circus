var config={}

// path resolver module name
config.pathresolver = 'static_path_resolver';

// path for DICOM data dumper tool.
config.dumper = 'c:\\dev\\node_work\\bin\\dicom_voxel_dump.exe';

// server port number
config.port = 3000;

// stdout buffer size
config.bufferSize = 512*512*1024;

module.exports = config;
