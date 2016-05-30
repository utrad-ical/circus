=========
CIRCUS DB
=========

CIRCUS DB is a clinical image database for CAD (computer-assisted/aided detection) users and developers.

Requirements and Dependencies
-----------------------------

- Windows or Linux (tested in CentOS)
- Node.js (including NPM)
- PHP (5.5 or higher), with MongoDB extension enabled


Quick Install
-------------

This is a quick overview. Refer to the corresponding official websites for more information.

1. Clone this repository using ``git clone``.

2. Install composer (PHP's dependency management system), and type ``composer install`` at the repository root.
   All the dependencies (including Laravel framework) will be downloaded.

   .. tip::

      With recent versions of Composer, you may be instructed to enter an OAuth2 consumer key/secret.
      In that case, log in to Bitbucket, go to the "OAuth" page under the settings screen,
      and create a new OAuth Consumer.
      You need to enter a dummy URL (anything) into the "Callback URL" button for the time being.

      See: https://github.com/composer/composer/issues/5166

3. Type ``npm install`` at the repository root, and then type ``npm run build``.
   Asset files (CSS, Front JS codes, etc) will be compiled from the source.

4. Install MongoDB, create database (with an arbitrary name) and set up authentication.

5. Go to ``/app/config``, copy ``db_config_sample.json`` to ``db_config.json``,
   and define appropriate db connection configurations according to your environment.

6. Set up initial database data (seeds). On your console, type::

     php artisan db:seed

   This will create initial group and user into the database.

7. Set up your web server. Configure Apache and host ``public`` directory.
   Alternatively, you may use PHP's built-in web server for debugging purpose.

8. (UNIX user) Modify directory permissions so that web server has write access under ``app/storage`` directory.

   .. tip::

      If you're working with Linux and encountered permission problems, check if some security module like SELinux is working.

License
-------

Modified BSD License.
