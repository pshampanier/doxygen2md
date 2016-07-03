# doxygen2md

> A doxygen to markdown converter.

Very limited for now. Tested on a C++ project. You can see the result [here](https://pshampanier.gitbooks.io/libpqmxx/content/) in the API section.

## Usage

1. Run `doxygen` to generate the XML documentation.
2. Run `doxygen2md` providing the folder location of the XML documentation.  

  ```
  Usage: doxygen2md [options] <doxygen xml directory>

  Options:

  -h, --help     output usage information
  -V, --version  output the version number
  -v, --verbose  verbose mode
  ```

The all documentation in the Markdown format is generated on stdout.