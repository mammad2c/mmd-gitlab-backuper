#!/usr/bin/env node

const clone = require("git-clone");
const axios = require("axios").default;
const fs = require("fs-extra");
const chalk = require("chalk");
const objChange = require("on-change");
const cliProgress = require("cli-progress");
const argv = require("yargs");

argv
  .usage("Backup gitlab repo in local machine")
  .option("token", {
    alias: "t",
    type: "string",
    description: "your Gitlab Personal Access Token",
  })
  .option("output", {
    alias: "o",
    type: "string",
    description: "Backup to output directory, defaults to ./repos",
  })
  .option("url", {
    alias: "u",
    type: "string",
    description: "Specify Gitlab URL, defaults to https://gitlab.com",
  })
  .help();

if (!argv.argv.token) {
  console.log(
    chalk.bgRed(
      "\n Please pass your gitlab personal access token. Check README.md to how grab it. \n"
    )
  );
  process.exit(0);
}

const token = argv.argv.token || "";
const baseUrl = argv.argv.url || "https://gitlab.com";
const output = argv.argv.output || "./repos";
const pagination = 100;
const defaultAddress = `/api/v4/projects?simple=true&membership=true&pagination=keyset&order_by=id&sort=asc&per_page=${pagination}`;
const bar = new cliProgress.SingleBar(
  {
    format: "progress [{bar}] {percentage}% | {value}/{total}",
  },
  cliProgress.Presets.shades_classic
);

let next;
let total = 0;
let firstStart = true;

axios.defaults.baseURL = baseUrl;
axios.defaults.headers.common["PRIVATE-TOKEN"] = token;

if (!fs.existsSync(output)) {
  fs.mkdirSync(output);
}

const observer = objChange(
  {
    cloned: 0,
    hasNext: true,
  },
  () => {
    if (observer.cloned === total && !observer.hasNext) {
      bar.stop();
      console.clear();
      console.log(chalk.green(`\n ${total} repo(s) has been saved!! \n`));
    }
  }
);

function isRepoExist(repoName) {
  return fs.existsSync(`${output}/${repoName}/.git`);
}

function cloneCompleted(repoName, showMessage = true) {
  if (showMessage) {
    console.log(chalk.green(`\n clone completed ${repoName} \n`));
  }

  observer.cloned += 1;
  bar.increment(1);
}

function main() {
  axios
    .get(next || defaultAddress)
    .then((res) => {
      const repos = res.data;
      const { length } = repos;
      total += length;
      const { link } = res.headers;

      if (firstStart) {
        bar.start(total, 0);
        firstStart = false;
      } else {
        bar.setTotal(total);
      }

      for (let i = 0; i < length; i += 1) {
        const repo = repos[i];
        const {
          name_with_namespace: nameWithNameSpace,
          http_url_to_repo: httpUrlToRepo,
        } = repo;
        const repoName = nameWithNameSpace.replace(/\//g, "-");
        const repoNameColor = chalk.cyan(repoName);
        const repoUrl = httpUrlToRepo.replace(
          "https://",
          `https://gitlab-ci-token:${token}@`
        );

        if (isRepoExist(repoName)) {
          cloneCompleted(repoNameColor, false);
        } else {
          console.log(chalk.yellow(`\n cloning ${repoNameColor} ... \n`));

          clone(`${repoUrl}`, `${output}/${repoName}`, undefined, () => {
            if (isRepoExist(repoName)) {
              cloneCompleted(repoNameColor);
            }
          });
        }
      }

      if (length !== 0 && link) {
        next = link.replace("<http", "http").replace(`>; rel="next"`, "");
        main();
      } else {
        observer.hasNext = false;
      }
    })
    .catch((err) => {
      console.log("err:", err.message);
    });
}

main();
