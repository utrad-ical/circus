# CIRCUS API

## Requirements

* Node.js (>=8.x)
* NPM (should be bundled with Node.js itself)
* MongoDB (>=3.x)
* `dicom_utility(.exe)` precompiled executable

## Setup and Install

1. Clone the repository.
   ```
   % git clone git@github.com:utrad-ical/circus-api.git
   ```

2. Install JavaScript dependencies.
   ```
   % npm ci
   ```
   (`npm install` is not safe because it may overwrite `package-lock.json`)

3. Configure the program via environment variables.
   You can manually set them in `.bashrc` or similar.
   Alternatively, you can add an `.env` file on the project root,
   which will be loaded using **dotenv**.

   - `CIRCUS_MONGO_URL`, which should look like
     `mongodb://localhost:27017/circus-api`.
   - `CIRCUS_MONGO_TEST_URL` (Optional)
   - `DICOM_UTILITY`, which is the path to the `dicom_utility` executable

6. Run DB migration.
   ```
   % node circus migrate
   ```

7. Run the program by `npm start` or `node server.js`.
   Alternatively, you can use a process manager
   such as **pm2** (suitable for deployment)
   or **nodemon** (suitable for development).

## Update

1. Pull the repository.
2. Run `npm ci`.
3. Run DB migration.
   ```
   % node circus migrate
   ```