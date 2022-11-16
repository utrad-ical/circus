#!/bin/bash
if test -d docker/displays; then
  rm docker/displays/*
else
  mkdir docker/displays
fi
cp -r dist/* docker/displays/
rm docker/displays/index.html docker/displays/main.js*