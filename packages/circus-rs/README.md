CIRCUS RS: DICOM Server and Viewer
==================================

Requirements
------------

- gulp (for installation)
- mongoose (for CIRCUSDB_path_resolver, optional)
- node-png (for PNGWriter_nodepng, optional)
- dicom_voxel_dump (for DicomVoxelDumperAdapter)

Build
-----

    # npm install
    # gulp

Configuration
-------------

All configuration data will go in `config.js` file.

- `pathResolver.module`: The module name for DICOM file path resolver.
- `pathResolver.options`: Additional data to pass to the path resolver. (See below)
- `dumper.module`: The module name for DICOM dumper module.
- `dumper.options`: Additional data to pass to DICOM dumper. (See below)
- `mpr.options.PNGWriter`: The module name for creating PNG image. (See below)
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

### PNGWriter configuraions

#### PNGWriter_pngjs
Default PNGWriter using 'pngjs' (written in JavaScript only).

- `mpr.options.PNGWriterOptions`: currently no options.

#### PNGWriter_nodepng
Alternative PNGWriter using 'png' (faster than PNGWriter_pngjs).
You need to install node-png to use this. (see https://github.com/pkrumins/node-png)

- `mpr.options.PNGWriterOptions`: currently no options.


Start server
------------

    # node build/circus-rs.js


Builtin modules
---------------

### Metadata

Get metadata of DICOM series.

#### request

http://<hostname_of_your_server_port>/Metadata

method: GET

- `series`: DICOM_series_instance_UID (required)

#### response

Response in JSON format.

- `x`: DICOM image width.
- `y`: DICOM image height.
- `z`: number of DICOM image.
- `voxel_x`: Size of voxel for x-axis (mm)
- `voxel_y`: Size of voxel for y-axis (mm)
- `voxel_z`: Size of voxel for z-axis (mm)
- `window_width`: estimated WindowWidth.
- `window_level`: estimated WindowLevel.
- `window_width_dicom`: WindowWidth specified in DICOM tag. (optional)
- `window_level_dicom`: WindowLevel specified in DICOM tag. (optional)
- `window_width_min`: Calcurated minimum WindowWidth from DICOM image's pixel format.
- `window_width_max`: Calcurated maxmum WindowWidth from DICOM image's pixel format.
- `window_level_min`: Calcurated minimum WindowLevel from DICOM image's pixel format.
- `window_level_max`: Calcurated maxmum WindowLevel from DICOM image's pixel format.

### MPR

Make MPR image and response in PNG format.

#### request

http://<hostname_of_your_server_port>/MPR

method: GET

- `series`: DICOM_series_instance_UID (required)
- `mode`: axial|coronal|sagittal (required)
- `target`: DICOM image index(0 based)
- `ww`: window width of output image. (optional. default is estimated window width)
- `wl`: window level of output image. (optional. default is estimated window level)

#### response

PNG (image/png)
