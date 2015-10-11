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


Authorization
-------------
If you want to restrict access to DICOM series image, you need to set 'true' for config.authorization.require parameter.
Then before access to any query to circus-rs server, you must call '/requestToken' to get access token and add 'X-CircusRs-AccessToken' http header to metadata/mpr/oblique/raw access.

And some optional parameter exists.
- `authorization.expire`: life time of token (in second, optional. default 1800). each token's expire can be updated if valid metadata/mpr/oblique/raw request occured.
- `authorizaiton.allowFrom`: ip address which can make request of requestToken. Regular expiression is ok. (optional. default '127.0.0.1')

Start server
------------

    # node circus-rs.js


Builtin modules
---------------

### metadata

Get metadata of DICOM series.

#### request

http://<hostname_of_your_server_port>/metadata

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

http://<hostname_of_your_server_port>/mpr

method: GET

- `series`: DICOM_series_instance_UID (required)
- `mode`: axial|coronal|sagittal (required)
- `target`: DICOM image index(0 based)
- `ww`: window width of output image. (optional. default is estimated window width)
- `wl`: window level of output image. (optional. default is estimated window level)

#### response

PNG (image/png)

### Single Oblique MPR

Make single oblique MPR image

#### request

http://<hostname_of_your_server_port>/oblique

method: GET

- `series`: DICOM_series_instance_UID (required)
- `a`: Angle counterclockwise from the X-axis of 'b' (required)
- `b`: Reference plane 'axial' or 'coronal' or 'sagittal' (required)
- `c`: Cursor position (3 numbers csv. required)
- `ww`: window width of output image. (optional. default is estimated window width)
- `wl`: window level of output image. (optional. default is estimated window level)

#### response

Header
- `X-Circus-Pixel-Size`: size of pixel (mm)
- `X-Circus-Pixel-Columns`: output image width (pixel)
- `X-Circus-Pixel-Rows`: output image height (pixel)
- `X-Circus-Center`: center position in output image (pixel, pixel)

PNG (image/png)

### raw

output dicom_voxel_dump raw stream.

#### request

http://<hostname_of_your_server_port>/raw

method: GET

- `series`: DICOM_series_instance_UID (required)

#### response

raw dump data in 'dicom_voxel_dump combined format'. (application/octet-stream)

### authorization

generate token to access metadata/mpr/oblique...

#### request

http://<hostname_of_your_server_port>/requestToken

method: GET

- `series`: DICOM_series_instance_UID (required)

#### response

Response in JSON format.

- `result`: 'ok' or 'ng'
- `token`: access token if result is 'ok'.
