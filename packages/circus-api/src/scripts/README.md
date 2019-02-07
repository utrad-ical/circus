# CIRCUS API Scripts

This directory contains utility scripts called in command line like:

```
$ node circus ulid
```

Each script file should export the following functions:

- `help(optionsText)`: Shows help message.
- `options()`: (optional) Returns options array passed to 'dashdash'.
- `async exec(opts)`: The main body of the script.