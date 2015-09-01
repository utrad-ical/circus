<?php

/*
|--------------------------------------------------------------------------
| Register The Artisan Commands
|--------------------------------------------------------------------------
|
| Each available Artisan command must be registered with the console so
| that it is available to be called. We'll register every command so
| the console gets access to each of the command object instances.
|
*/

Artisan::add(new ImportDicom);
Artisan::add(new AnonymizeDicom);
Artisan::add(new DeleteSeries);
Artisan::add(new ExportVolume);
Artisan::add(new GetSeries);
Artisan::add(new TaskDummyWait);
Artisan::add(new ExportCase);
Artisan::add(new BuildRs);
Artisan::add(new ManageRs);
Artisan::add(new ImportCase);