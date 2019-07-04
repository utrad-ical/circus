# CIRCUS CS Core: Plugin Job Manager

## Requirements

- Docker
- Node.js
- (MongoDB) It's possible to use non-Mongo adapters, but it's not fully supported.

## Getting Started

### Install

Clone the repository (Installing from NPM is not available yet).

```
$ git clone git@github.com:utrad-ical/circus-cs-core.git .
$ npm ci
```

Prepare docker and load image archives.

```bash
# This is a hard-coded dependency which is always required
$ docker load -i circus_dicom_voxel_dump_1.0.tar
```

### Configuration

We use [cosmiconfig](https://github.com/davidtheclark/cosmiconfig) to configure CIRCUS CS.

The config file `.cscorerc.json` (or other supported file) will be searched
from this directory (circus-cs-core repository root) up to your home directory.

The content of this file would look like this:

```json
{
  "jobRunner": {
    "options": {
      "pluginResultsDir": "/var/circus/plugin-results",
      "cleanPluginWorkingDir": true
    }
  }
}
```

There is no full documentation yet.
See `src/config/default.ts` for the available options.

### Run Check Command

The `cui.js` is a utility command-line interfact to access
various functions of CIRCUS CS Core. The syntax is:

```
node cui [subcommand]
```

Just do `node cui` to see all the available subcommands.

```bash
$ node cui check-env
Plugin working directory      : [OK]
Docker connection             : [OK]
MongoDB connection            : [OK]
```

## Unit Test

```bash
# Obtain official 'hello-world' docker image.
# Used for some tests to check the connection with the Docker daemon.
$ docker pull hello-world

# Build several dummy plug-ins for testing docker integrations.
$ cd test/docker
$ node build.js

# Run test scripts
$ jest
```
