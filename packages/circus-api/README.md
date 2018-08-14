# CIRCUS API

## Requirements

* Node.js (>=8.x)
* NPM
* MongoDB (>=3.x)

## Setup and Install

1. Clone the repository.

2. Run `npm install`.

3. Add an environment variable `CIRCUS_MONGO_URL` which should look like
   `mongodb://localhost:27017/circus-api`. Alternatively, you can add
   `.env` file on the project root, which will be loaded using `dotenv`.

4. (Optional) Add another envioronment variable `CIRCUS_MONGO_TEST_URL`.

5. Place dicom_utility executable to somewhere and specify its path
   via a `DICOM_UTILITY` environment variable (or `.env` file).

6. Run DB migration.
   ```
   % node circus migrate
   ```
