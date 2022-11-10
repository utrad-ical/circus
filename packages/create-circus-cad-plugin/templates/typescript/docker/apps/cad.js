const path = require("path");
const fs = require("fs").promises;

const inDir = process.argv[2]; // Input mhd file can be use from here
const outDir = process.argv[3]; // Output file must be saved here
const currentDir = path.dirname(process.argv[1]); // Output file must be saved here

const resultData = {
  results: {
    item01: "test",
    item02: "test?",
    item03: "test.",
    item04: "test!",
    test: "test...",
    location: [111, 222, 333],
  },
};
fs.writeFile(
  `${outDir}/results.json`,
  JSON.stringify(resultData, null, "    ")
);

fs.copyFile(`${currentDir}/sample.png`, `${outDir}/sample.png`, 0, (err) => {
  if (err) {
    console.log(err.stack);
  } else {
    console.log("Done.");
  }
});
