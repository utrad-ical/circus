CIRCUS RS: DICOM Server and Viewer
==================================

CIRCUS RS is a set of:

- Canvas-based HTML widget (component) that works as a DICOM image viewer
- Node.js web server which serves DICOM voxel data as an image or octet-stream

It fully supports multiplanar reconstruction (MPR) and voxel-based annotations.

Requirements
------------

- Node.js (>= 4.0)

Build
-----

```
# npm install
# gulp
```

Test
----

Uses mocha. Tests are only partially written for now.

```
npm test
```

Alternatively, you can install mocha globally, which gives
more options.

```
npm install -g mocha
mocha
```