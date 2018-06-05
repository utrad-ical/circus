CIRCUS CS Core: Plugin manager queue system
=================================================

Requirements
------------

- Node.js (>= 8.9)

Build
-----

```
# npm install
```

Draft
-----

```
Edit config/default.js
 - dicomFileRepository
  - options
   - dataDir

Prepare docker and load image archives.
$ docker load -i circus_lung_cad_v.1.4.tar
$ docker load -i circus_dicom_voxel_dump_1.0.tar

Execute sample
$ node core [seriesUID] [your temporary directory]

Check plugin result
$ find [your temporary directory]/out
```
