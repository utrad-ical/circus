# CIRCUS API

## Requirements

* Node.js (>=8.x)
* NPM
* MongoDB (>=3.x)

## Setup and Install

1. Clone the repository.

2. Run `npm install`.

3. Add an environment variable `CIRCUS_MONGO_URL` which should look like
   `mongodb://localhost:27017/circus-api`.

4. (Optional) Add another envioronment variable `CIRCUS_MONGO_TEST_URL`.

5. Run DB migration.
   ```
   % node circus migrate
   ```
