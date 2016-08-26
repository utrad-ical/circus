---
title: Running the Server
---

# Running the CIRCUS RS Server

CIRCUS RS server is a HTTP-based server which holds DICOM series in-memory and transports relevant data over JSON-based APIs.

CIRCUS RS is HTTP-based; the server does not understand the DICOM protocol.
{:.alert .alert-warning}

## Understanding Path Resolver

For the server to serve images, the server naturally has to know where the actual DICOM files are stored in your drive. A **path resolver** is a small JavaScript module which maps series instance UIDs to physical directory paths.

Out of the box, CIRCUS CS comes with a simple default path resolver class, namely `StaticPathResolver`, which takes the base directory path as the parameter and assumes series files are separately stored in directories according to a certain rule.

While `StaticPathResolver` is useful for basic applications and testing purposes, you can configure CIRCUS RS to use another external path resolver.

## About Image Encoder

An `ImageEncoder` is a base class for creating compressed, browser-friendly image files such as PNG files. By default, CIRCUS RS server uses `ImageEncoder_pngjs`, which is built-in and internally uses a pure-JS PNG encoder without any binary dependency.

Optionally, you can use `ImageEncoder_nodepng`, which does the same job via C++ extension of Node. This is considerably faster.

## Starting Up the Server

On the shell:

```
node ./circus-rs.js
```

This will launch a http server on the default port (3000). After the server is launched, access using your favorite browser, `http://localhost:3000/status`.

The use of `forever` or `nodemon` is strongly recommended.

## Configuration

The path to a configuration file can be passed as a command-line parameter:

```
node ./circus-rs --config=path/to/your/config.json5
```

Optionally, configuration can go in `config/local.js`, `config/local.json` or `config/local.json5`.

JSON5 is an extension of JSON, which allows comments and some other human-friendly syntax. Do not forget to use the appropriate file extension (`.json5`) when you use JSON5.

Available configuration parameters are as follows. The default values are defined in `config/default.js`.

`port`
: The port number on which the server runs.

`pathResolver.module`
: The module name for the path resolver.

`pathResolver.options`
: Additional option data passed to the path resolver.

`dumper.module`
: The module name for DICOM dumper module.

`dumper.options`
: Additional data passed to DICOM dumper.

`imageEncoder`
: The module name for image export

`cache.memoryThreshold`
:  upper limit of heap memory size in bytes.

`authorization`
: Authorization-related matter. See below.

### Path resolver configurations

#### StaticPathResolver

`pathResolver.options.dataDir`
: Full physical path for the stored DICOM series.

`pathResolver.options.useHash`
: Set true if your path for the stored DICOM series contains hash part.

#### CircusDbPathResolver

This PathResolver will be removed from the repository.
{:.alert .alert-warning}

You need to install mongoose to use this. (See http://mongoosejs.com/docs/index.html)

`pathResolver.options.configPath`
: CIRCUS DB database config file's path.

### DICOM dumper configurations

#### DicomVoxelDumperAdapter

`dumper.options.dumper`
: Full physical path and filename for dicom_voxel_dump.

`dumper.options.bufferSize`
: Buffer size of stdout buffer. Don't change unless needed.

### ImageEncoder configuraions

#### ImageEncoder_pngjs

Default ImageEncoder using 'pngjs' module (written in JavaScript only). Currently there are no options.

#### ImageEncoder_nodepng

Alternative PNG writer using 'png' (needs compile but faster than ImageEncoder_pngjs). You need to install node-png to use this. (see https://github.com/pkrumins/node-png)

Currently there are no options.

## Authorization

If you want to restrict access to DICOM series image, you need to set `true` for config.authorization.require parameter.

Before accessing to any resource on the CIRCUS RS server, a client must fetch the access token by calling '/requestToken'. Then the client must add `Authorization` HTTP header for accessing sensitive resources.

And some optional parameters exist:

- `authorization.expire`: Life time of the token (in second, optional. default 1800). Each token's expiriration date will be updated automatically if a valid metadata/mpr/oblique/raw request occurred.
- `authorizaiton.allowFrom`: IP address from which a client can make a `requrestToken` request. Regular expressions are accepted. (optional. default '127.0.0.1')
