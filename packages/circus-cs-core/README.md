# CIRCUS CS Core: Plugin manager
=================================================

## Requirements
----------------------
- MongoDb
- Docker
- Node.js

## Build
----------------------

```
$ git clone git@github.com:utrad-ical/circus-cs-core.git .
$ npm install
```

## Get started?
----------------------

### Prepare docker and load image archives.
```
$ docker load -i circus_lung_cad_v.1.4.tar
$ docker load -i circus_dicom_voxel_dump_1.0.tar
$ docker images -a --format  "{{.Repository}}:{{.Tag}}"
...
circus/lung_cad:1.4
circus/dicom_voxel_dump:1.0
...
```
### Prepare DICOM repository.
- Edit `config/default.js`
	- dicomFileRepository
		- options
			- dataDir
- Put some dicom data to there.
	- A direcotry name shoud be the seriesUid.

### Prepare Mongo Db
- Create a db for cs-core in your mongoDb.
- Edit `config/default.js`
	- queue
- `$ node cui up_queue_mongodb` for creating collection of core queue system automatically.

### Sample execution

```
$ node cui check_env
OK
$ node cui register --pluginId=Lung-CAD --seriesUid=[seriesUID]
$ node cui next
```
