# CIRCUS API Tools

Currently, this tool can:

- Show user's preference (primarily for testing the auth status)
- Download case data as MHD

## Install

1. Install [Node](https://nodejs.org/). **Node 18** or later is required.

2. Run the following command (NPM is a node package manager that will be installed along with Node itself):

   ```
   npm install -g @utrad-ical/circus-api-util
   ```

3. Run the following command to check if the API client has been successfully installed:

   ```
   circus-api-util --version
   ```

4. Create a file called `.circusapirc` in your home directory. Its contents should look like the following:

   ```
   CIRCUS_API_TOKEN=3bac24b0c2f79085c5fceb15c7fffb9565a39062
   CIRCUS_API_ENDPOINT=http://111.222.333.444/api/
   ```

5. Run the following command to check if the API can connect to a running CIRCUS API server:

   ```
   circus-api-util preferences
   ```

   It will display the list of your preferences. If it fails, check if the `.circusapirc` has been properly configured.
