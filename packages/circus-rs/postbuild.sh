#!/bin/bash
lessc src/browser/circus-rs.less lib/browser/circus-rs.css
cp src/browser/circus-rs.less lib/browser/
find src -name \"*.vert\" -or -name \"*.frag\" | cpio -upd lib