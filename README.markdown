## Information

Zoomooz is an easy-to-use jQuery plugin for making any web page element zoom.

Size of Zoomooz is 5KB gzipped, 14KB minified and 43KB originally (as of April 4 2012). This includes everything but jQuery.

## Installation and usage

Basically, just have a look at the examples and start hacking away.

For more information and usage, see: http://janne.aukia.com/zoomooz

## Building

There is an optional build process. Currently the only thing it does is that it merges and minifies Javascript files, so running it is not necessary.

### Setting up the build tools

1. Download and install Node.js (npm should install automatically):

  http://nodejs.org/#download
    
2. Install node-jake and uglify-js:

        npm install jake
        npm install uglify-js

### Running the build

    cd src
    jake