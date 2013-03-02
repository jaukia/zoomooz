#!/bin/bash

# requires pyobjc, to install:
# > easy_install pyobjc

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
EXAMPLE_DIR=file://$DIR/../examples
THUMB_DIR=../website-assets/images/thumbnails/

echo "Work directory url: "+$EXAMPLE_DIR

python ./webkit2png.py --filename=imagestack $EXAMPLE_DIR/imagestack/index.html?q=zooming -D $THUMB_DIR. -C --delay=2
python ./webkit2png.py --filename=isometric $EXAMPLE_DIR/isometric/index.html -D $THUMB_DIR. -C --delay=2
python ./webkit2png.py --filename=simple $EXAMPLE_DIR/simple/index.html -D $THUMB_DIR. -C
python ./webkit2png.py --filename=hierarchy $EXAMPLE_DIR/hierarchy/index.html -D $THUMB_DIR. -C
python ./webkit2png.py --filename=rootchange $EXAMPLE_DIR/rootchange/index.html -D $THUMB_DIR. -C
python ./webkit2png.py --filename=svgtree $EXAMPLE_DIR/svgtree/index.html -D $THUMB_DIR. -C
