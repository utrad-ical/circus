#!/bin/bash
grep -lr circus-lib/src lib/ | xargs sed -i -e 's&circus-lib/src&circus-lib/lib&g'
lessc src/browser/circus-rs.less lib/browser/circus-rs.css
cp src/browser/circus-rs.less lib/browser/
cd src/ && find . -name *.vert -or -name *.frag | cpio -upd ../lib/