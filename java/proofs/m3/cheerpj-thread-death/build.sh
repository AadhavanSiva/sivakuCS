#!/bin/sh
# Builds repro.jar next to this script (JDK 25): sh build.sh
set -e
cd "$(dirname "$0")"
rm -rf out && mkdir out
javac --release 25 -d out Repro.java ReproConcat.java
(cd out && jar cf ../repro.jar *.class)
rm -rf out
