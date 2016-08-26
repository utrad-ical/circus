CIRCUS RS: DICOM Server and Viewer
==================================

Requirements
------------

- gulp (for installation)
- mongoose (for CIRCUSDB_path_resolver, optional)
- node-png (for ImageEncoder_nodepng, optional)
- dicom_voxel_dump (for DicomVoxelDumperAdapter)

Build
-----

    # npm install
    # gulp

Test
----

Uses mocha. Tests are only partially written for now.

    # npm test

Alternatively, you can install mocha globally, which gives
more options.

    # npm install -g mocha
    # mocha
