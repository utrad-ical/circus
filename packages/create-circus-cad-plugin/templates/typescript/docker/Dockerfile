FROM node:16.14.0

# Add plugin manifest file.
COPY plugin.json /

# Add main script for this CAD.
COPY apps/* /apps/

# Add custom display.
COPY displays/* /displays/

# This is the main entry point when this container is invoked.
CMD ["node", "/apps/cad.js", "/circus/in", "/circus/out"]