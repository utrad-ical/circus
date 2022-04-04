#!/bin/bash
grep -lr circus-lib/src lib/ | xargs sed -i -e 's&circus-lib/src&circus-lib/lib&g'
grep -lr circus-rs/src lib/ | xargs sed -i -e 's&circus-rs/src&circus-rs/lib&g'