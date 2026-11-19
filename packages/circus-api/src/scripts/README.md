# CIRCUS API Scripts

Run administrative commands with `pnpm circus` in the workspace or `circus`
in the API container. Use `circus --help` to list commands and
`circus <group> <command> --help` to see its arguments and options.

Each command file exports `configure(program)` to register its Commander
subcommand under a group. The action passes the parsed arguments to `runCommand`, which
loads the services needed by the command and disposes of them after the
command finishes. Register new commands in `index.ts`.
