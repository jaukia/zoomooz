## Information

Zoomooz is an easy-to-use jQuery plugin for making any web page element zoom.

## Installation and usage

Basically, just have a look at the examples and start hacking away.

For more information and usage, see: http://janne.aukia.com/zoomooz

## Building

There is an optional build process. Currently the only thing it does is that it merges and minifies Javascript files, so running it is not necessary.

### Setting up the build tools

1. Download and install Node.js:

  http://nodejs.org/#download
  
        ./configure
        make
        make install

1. Install npm (sudo with own risk if problems):

        curl http://npmjs.org/install.sh | sh
        sudo chown -R $USER /usr/local/lib/node/
        sudo chown -R $USER /usr/local/bin/
    
1. Install node-jake:

        npm install jake

1. Install uglify-js:

        npm install uglify-js

### Running the build

    jake