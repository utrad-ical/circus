# Create CIRCUS CAD Plug-in

> **⚠ WARNING: Perhaps this plugin may not be necessary!**  
> You don't need this plug-in if you want to present CAD results by the default displays.  
> Please check [here](https://circus-project.net/docs/dev/cs/result-display) how to use default displays.

<img alt="Logo" align="right" src="https://circus-project.net/img/circus-main-logo.svg" width="20%" />

Create CIRCUS CAD plug-in and custom viewer.

- [What is CIRCUS](https://circus-project.net/)
- [How to create custom viewer in detail](https://circus-project.net/docs/dev/cs/custom-display)

## Creating an CAD Plug-in

```sh
npx @utrad-ical/create-circus-cad-plugin -i
```

Inside the current directory, it will generate the CAD template and install the dependencies:<br>

```
current directory
├── README.md
├── node_modules
├── package.json
├── package-lock.json
├── postbuild.sh
├── server.js
├── tsconfig.json
├── webpack.config.js
├── data
│   ├── results.json
│   └── sample.png
├── docker
│   ├── Dockerfile
│   ├── plugin.json
│   └── src
│       ├── cad.js
│       └── sample.png
├── public
│   └── index.html
└── src
    ├── App.tsx
    ├── bootstrap.tsx
    ├── index.ts
    ├── sampleJob.json
    └── components
        └── SampleViewer.tsx
```

## Register the Default Template in CIRCUS

1. Build the template viewer

```sh
npm run build
```

2. Build the docker image

```sh
cd docker
docker build -t [REPOSITORY]:[TAG] .
```

3. Check the image ID

```sh
docker images --no-trunc
```

4. Register the docker image in CIRCUS

```sh
cd [directory of circus project]/packages/circus-api
node circus register-cad-plugin [image ID]
```

## Register your CAD in CIRCUS

- save executable file: `./docker/apps`
- save infomation of your CAD plugin: `./docker/plugin.json`
- modify Dockerfile to run your executable file: `./docker/Dockerfile`
- modify viewer component: `.webpack.config.js`, `src/components/SampleViewer.tsx`
- add sample result files to check your viewer in local: `./data`, `src/sampleJob.json`
