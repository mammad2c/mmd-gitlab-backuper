const cliProgress = require("cli-progress");
const objChange = require("on-change");

const token = "123";
const baseUrl = "https://gitlab.com";
const output = "./repos/";
const bar = new cliProgress.SingleBar(
  {
    format: "progress [{bar}] {percentage}% | {value}/{total}",
  },
  cliProgress.Presets.shades_classic
);

const observer = objChange(
  {
    cloned: 0,
    hasNext: true,
  },
  () => {}
);

global.TOKEN = token;
global.BASE_URL = baseUrl;
global.OUTPUT = output;
global.BAR = bar;
global.OBSERVER = observer;
