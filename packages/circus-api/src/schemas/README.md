CIRCUS API Schema
=================

This directory contains JSON schema definitions.
Each schema is stored in YAML format, and loaded on API startup.

Each schema file:

- Should not contain the `$id` keyword. It is determined from the file name.
- Must have `$async: true` option. All validations must be performed asynchronously.

