const cliProgress = require("cli-progress");
const objChange = require("on-change");
const Utils = require("../lib/utils");

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

const utils = new Utils({
  token,
  url: baseUrl,
  output,
  bar,
  observer,
});

describe("utils spec", () => {
  it("should render correctly repo url: ", () => {
    const repoUrl = "https://gitlab.com/test-group1/test1.git";
    const expectedUrl = `https://oauth2:${token}@gitlab.com/test-group1/test1.git`;

    expect(utils.generateRepoUrl(repoUrl)).toBe(expectedUrl);
  });
});
