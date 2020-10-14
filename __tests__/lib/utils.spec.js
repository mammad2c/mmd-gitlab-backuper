const Utils = require("../../lib/utils");

const utils = new Utils({
  token: global.TOKEN,
  url: global.BASE_URL,
  output: global.OUTPUT,
  bar: global.BAR,
  observer: global.OBSERVER,
});

describe("utils", () => {
  it("should generate repo url correctly", () => {
    const repoUrl = "https://gitlab.com/test-group1/test1.git";
    const expectedUrl = `https://oauth2:${global.TOKEN}@gitlab.com/test-group1/test1.git`;

    expect(utils.generateRepoUrl(repoUrl)).toEqual(expectedUrl);
  });
});
