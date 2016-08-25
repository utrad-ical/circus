---
title: Server API
layout: default
---

# Server API

This article describes the API for CIRCUS RS server module. The implementation for each action is found in `src/server/controllers`.

<style>
.caution { color: red; background-color: rgba(255, 0, 0, 0.1); border: 1px solid red; padding: 1em; font-weight: bold; }
</style>

<div class="caution">
CAUTION: CIRCUS RS is still in its early development stage. This is subject to change.
</div>

## How to Call API

CIRCUS RS server is a simple web-based API which responds to HTTP requests.

## Authentication

By default, CIRCUS RS server returns images for any requests containing valid series instance UID. When authentication mode is enabled, most requests must be authenticated by sending a access token to the server.

--------------------------------

## `status` Action

Returns the server status in JSON.

| Item | Value |
|-|-|
| HTTP Method | GET |
| Authentication | No |
| Response MIME-Type | `application/json` |

### Request

Example:

```
/status
```
There are no parameters.

### Response

JSON-encoded string that contains various server status.

## `metadata` Action

Returns metadata of the specified DICOM series.

| Item | Value |
|-|-|
| HTTP Method | GET |
| Authentication | Yes (optional) |
| Response MIME-Type | `application/json` |

### Request

Example:

```
/metadata?series=111.222.3333
```

- `series`: DICOM_series_instance_UID (required)

### Response

JSON-encoded string that contains the following series information.

- `voxelCount`: DICOM image size.
- `voxelSize`: Size of each voxel [mm].
- `estimatedWindow`: Estimated window width/level.
- `dicomWindow`: Window width/level as defined in DICOM file itself.
- `pixelFormat`: Pixel format number as defined in PixelFomat.js.

## `mpr` Action

Returns orthogonal MPR image.

| Item | Value |
|-|-|
| HTTP Method | GET |
| Authentication | Yes (optional) |
| Response MIME-Type | `image/png` |

### Request

Example:

```
/mpr?series=111.222.3333&mode=axial&target=3&ww=50&wl=50
```

- `series`: DICOM_series_instance_UID (required)
- `mode`: axial|coronal|sagittal (required)
- `target`: DICOM image index(0 based)
- `ww`: window width of output image. (optional. default is estimated window width)
- `wl`: window level of output image. (optional. default is estimated window level)

### Response

Image data encoded by `ImageEncoder`


## `oblique` Action

Makes single oblique MPR image.

| Item | Value |
|-|-|
| HTTP Method | GET |
| Authentication | Yes (optional) |
| Response MIME-Type | `image/png` with additional HTTP headers |

### Request

Example:

```
/oblique?series=111.222.3333&a=0.1&b=axial&c=2,3,5
```

method: GET

- `series`: DICOM_series_instance_UID (required)
- `a`: Angle counterclockwise from the X-axis of 'b' (required)
- `b`: Reference plane 'axial' or 'coronal' or 'sagittal' (required)
- `c`: Cursor position (comma-separated 3 numbers; required)
- `ww`: window width of output image. (optional. default is estimated window width)
- `wl`: window level of output image. (optional. default is estimated window level)

### Response

Image data encoded by `ImageEncoder`, with the following HTTP headers:

- `X-Circus-Pixel-Size`: size of pixel (mm)
- `X-Circus-Pixel-Columns`: output image width (pixel)
- `X-Circus-Pixel-Rows`: output image height (pixel)
- `X-Circus-Center`: center position in output image (pixel, pixel)



## `raw` Action


output dicom_voxel_dump raw stream.

| Item | Value |
|-|-|
| HTTP Method | GET |
| Authentication | Yes (optional) |
| Response MIME-Type | `application/octet-stream` |


### Request

Example

```
/raw?series=111.222.3333
```

- `series`: DICOM_series_instance_UID (required)

### Response

Gzipped raw dump data.



## `requestToken` Action


| Item | Value |
|-|-|
| HTTP Method | GET |
| Authentication | No |
| Response MIME-Type | `application/json` |


generate token to access metadata/mpr/oblique...

### Request

Example:

```
/requestToken?series=111.222.3333
```

- `series`: DICOM_series_instance_UID (required)

### Response

- `result`: 'ok' or 'ng'
- `token`: access token if result is 'ok'.
