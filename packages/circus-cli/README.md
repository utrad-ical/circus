# CIRCUS CLI

This is an API client to connect to CIRCUS API Server.

This utility can make a generic authorized API requests using the following commands (although you have to construct a JSON reuqest body manually):

- `api get`
- `api post`
- `api put`
- `api patch`

This utility also has several specialized commands that can do the following:

- Download case data as MHD
- Add a new revision to a case
- Uploads/downloads blobs (label binary data)
- Show the all mylists belonging to the user

**Note:** This is an HTTP client that works by accessing CIRCUS API Server (REST API). CIRCUS also provides admin CLI, which is available only for server administrators. Some operations may work more efficiently via admin CLI because it does not use HTTP connections.

## Install

1. Install the latest [Node](https://nodejs.org/).

2. Run the following command (NPM should have been installed along with Node itself):

   ```
   npm install -g @utrad-ical/circus-cli
   ```

   This will install the client globally, i.e., somewhere in your PATH.

   **Tip:** You can update the tool using the same command.

3. Run the following command to store an API token to your machine:

   ```
   circus-cli auth login
   ```

   You will be prompted to enter two values:

   - **API Endpoint**, e.g., "http://111.222.333.444/api/".
   - **API Token**, e.g., "3bac24b0c2f79085c5fceb15c7fffb9565a39062". This can be generated via the web UI.

   The command checks that the API is reachable and accepts the token before saving the connection.

4. You can see the list of commands like this:

   ```
   circus-cli --help
   ```

   To list the commands in a group or get help for a specific command, use `--help`:

   ```
   circus-cli case --help
   circus-cli case create --help
   ```

## Connection settings

`circus-cli auth login` saves the endpoint and token in a JSON configuration file. The file contains one profile named `default`:

```json
{
  "formatVersion": 1,
  "profiles": [
    {
      "name": "default",
      "endpoint": "https://circus.example.org/api/",
      "token": "your-api-key"
    }
  ]
}
```

- With an absolute `XDG_CONFIG_HOME`, the file is `$XDG_CONFIG_HOME/circus-cli/config.json`.
- On Linux and macOS, the default path is `~/.config/circus-cli/config.json`.
- On Windows, the default path is `%APPDATA%\circus-cli\config.json`. If `APPDATA` is unavailable, the CLI uses `AppData\Roaming\circus-cli\config.json` under your home directory.

Set both `CIRCUS_API_ENDPOINT` and `CIRCUS_API_TOKEN` to use a connection from the environment, for example in scripts. When set, they take precedence over the saved connection. Run `circus-cli auth logout` to delete the saved connection.
