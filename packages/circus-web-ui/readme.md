## CIRCUS DB

CIRCUS DB is a clinical image database for CAD (computer-assisted/aided detection) users and developers.

### How to develop

1. Clone this repository using git.
2. Install composer (PHP's dependency management system),
   and type `composer install` at the repository root.
   All the dependencies (including Laravel framework) will be downloaded.
3. Install MongoDB, create database (with an arbitrary name) and set up authentication.
4. Go to `/app/config`, copy `db_config_sample.json` to `db_config.json`,
   and define appropriate db connection configurations according to your environment.
5. Set up your web server and host `public` directory.
   Alternatively, you may use PHP's built-in web server for debugging purpose.

### License

Modified BSD License.
