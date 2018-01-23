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

Developer's start up guide
--------------------------

1. Create your config file and save it as `config/local.json5`

  - This file overwrites the content of `config/default.json`.
  - Don't remove `config/default.json`. It functions as a default.
  - The most important setting you have to change in most cases is `dicomFileRepository.options.dataDir`.

2. Check your Node.js version. 8.9 or later is required.

3. (optional) Install webpack globally if you want to just type `webpack` and build.

   ```
   $ npm install -g webpack
   ```

4. Prepare dicom images on your `dicomFileRepository.options.dataDir` direcoty.

5. Start webpack-dev-server. To run with the default settings:

   ```
   $ npm run devserver
   ```
  
   If you want to specify command-line options:

   ```
   $ npx webpack-dev-server --host 0.0.0.0
   ```

6. Start CIRCUS-RS server.

   ```
   $ npm start
   ```

7. Access to http://webpack-dev-server:PORT/. The `PORT` is the port used by webpack-dev-server, not that of CIRCUS RS server. By default, an available port will be searched from 8080.

8. Fill the fields and push the run button on the page. See if the image has loaded correctly.
