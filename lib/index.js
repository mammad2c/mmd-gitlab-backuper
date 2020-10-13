#!/usr/bin/env node

const axios = require("axios").default;
const chalk = require("chalk");
const cliProgress = require("cli-progress");
const argv = require("yargs");
const shell = require("shelljs");
const Utils = require("./utils");
const getRepos = require("./getRepos");

/**
 * define script options.
 */
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
    chalk.red(
      "\nPlease pass your gitlab personal access token. Check README.md to how grab it. \n"
    )
  );
  process.exit(1);
}

/**
 * check for git commands exist.
 */
if (!shell.which("git")) {
  shell.echo(`${chalk.red("Sorry, this script requires git")}`);
  shell.exit(1);
}

/**
 * defining our needs.
 */
const pagination = 100; // currently maximum gitlab pagination supports.
const minAccessLevel = 20; // guests not allowed to download repo.
const defaultAddress = `/api/v4/projects?simple=true&membership=true&pagination=keyset&order_by=id&sort=asc&per_page=${pagination}&min_access_level=${minAccessLevel}`;
const bar = new cliProgress.SingleBar(
  {
    format:
      "\nprogress [{bar}] {percentage}% | {value}/{total} | this may take several minutes \n",
  },
  cliProgress.Presets.shades_classic
);

/**
 * create an object for storing arguments and use it every where.
 */
const scriptOptions = {
  token: argv.argv.token || "",
  baseUrl: argv.argv.url || "https://gitlab.com",
  output: argv.argv.output || "./repos",
};

/**
 * for saving next paginated data url.
 */
let next;

/**
 * total repository for handling progress bar.
 */
const totalRepos = [];

axios.defaults.baseURL = scriptOptions.baseUrl;
axios.defaults.headers.common["PRIVATE-TOKEN"] = scriptOptions.token;

/**
 * generate our uitls.
 */
const utils = new Utils(bar, scriptOptions);

/**
 * main function:
 * we make a request to gitlab for fetching available repos in this particular request.
 * at the beginning we don't have next url so we fetch from defaultAddress, in next recursive call it should be next url
 * this mechanism guarantee that we can take all repos if they are paginated.
 */
function main() {
  axios
    .get(next || defaultAddress)
    .then((res) => {
      const repos = res.data;
      const { length } = repos;

      /**
       * based on gitlab pagination document, the next url to be called come here, so we grab it and save it
       * to handle our pagination process.
       */
      const { link } = res.headers;

      for (let i = 0; i < length; i += 1) {
        totalRepos.push(repos[i]);
      }

      /**
       * handle pagination.
       * based on gitlab document, if our array length is 0 and link also is no absence then we have all of our repos data.
       */
      if (length !== 0 && link) {
        next = Utils.generateNextLink(link);

        /**
         * after saving next url that should be called, we call again our main function.
         */
        main();
      } else {
        /**
         * if we don't have any other repos url, so we stop our pagination process and
         * start cloning the repositories.
         */

        console.log(
          chalk.yellow(`\n${totalRepos.length} repo(s) available for clone!\n`)
        );

        getRepos(totalRepos, utils, bar, scriptOptions)
          .then(() => {
            bar.stop();
            console.clear();
            console.log(
              chalk.green(
                `\n \n \n ${totalRepos.length} repo(s) saved!! \n \n \n`
              )
            );
            process.exit(0);
          })
          .catch((err) => {
            console.log(`\n ${chalk.red(err.message)}`);
            process.exit(1);
          });
      }
    })
    .catch((err) => {
      console.log(`\n${chalk.red(err.message)} \n`);
      console.log(`\n${chalk.red(`trace: ${err.stack}`)} \n`);
      process.exit(1);
    });
}

console.log(
  chalk.yellow("\nStart fetching available repositories, please wait ...\n")
);

main();
