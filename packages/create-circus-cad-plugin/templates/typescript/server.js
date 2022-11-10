const jsonServer = require("json-server");
const opts = require("opts");
const fs = require("fs");

opts.parse([
  {
    short: "p",
    long: "port",
    description: "HTTP port",
    value: true,
    required: false,
  },
]);

const server = jsonServer.create();
const middlewares = jsonServer.defaults({ static: `${__dirname}/data` });
const port = opts.get("port") || 3000;

server.use(middlewares);
server.use((req, res, next) => {
  const dir = `${__dirname}/data/${req.url}`;
  console.log(dir, req.url);
  const stats = fs.statSync(dir);
  if (stats.isDirectory()) {
    const fileList = fs.readdirSync(dir);
    res.status(200).send(fileList);
  }
  next();
});

server.listen(port, () => {
  console.log(`JSON Server is running in localhost:${port}`);
});
