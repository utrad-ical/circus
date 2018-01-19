CIRCUS RS: DICOM Server and Viewer
==================================

CIRCUS RS is a set of:

- Canvas-based HTML widget (component) that works as a DICOM image viewer
- Node.js web server which serves DICOM voxel data as an image or octet-stream

It fully supports multiplanar reconstruction (MPR) and voxel-based annotations.

Requirements
------------

- Node.js (>= 8.9)

Build
-----

```
# npm install
# npm run build
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

Developper's start up guide
---------------------------
1. Create your config file and save as `config/local.json5`
  - This file is to overwrite content of `config/default.json`.
  - Don't remove `config/default.json`. It functions as a default if not written on your custom config file.
  - In many cases, you need to change `dicomFileRepository.options.dataDir`.

2. Check your node version.
  - Required node < 5.3.0

3. Upgrade your node and anythings related.

4. Install webpack if not installing it.
  - Sometimes use global option `-g`.

5. Prepare dicom images on your `dicomFileRepository.options.dataDir` direcoty.

6. Start webpack-dev-server
  - `$ npm run devserver` or `$ npx webpack-dev-server --host 0.0.0.0` or somthing like that.

7. Start CIRCUS-RS server.
  - `$ npm start`

8. Access to http://webpack-dev-server:PORT/
  - The `PORT` is your webpack-dev-server's port, not circus-rs server's.
  - The default port is 8080.

9. Fill some fields and push the run-button on the page.

10. Did you see your image ?

