# CIRCUS CS Core: Plugin Job Manager

This code contains plug-in job manager for the CIRCUS CS project.

**Why is this a separate project?** Because the job manager is a separate program that can run without the API server. A user can build a separate

## CUI

The `cui.js` is a utility command-line interface to access various functions of CIRCUS CS Core. The syntax is:

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
