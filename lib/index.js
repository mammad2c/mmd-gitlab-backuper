#!/usr/bin/env node

const clone = require("git-clone");
const axios = require("axios").default;
const fs = require("fs-extra");
const chalk = require("chalk");
const objChange = require("on-change");
const cliProgress = require("cli-progress");
const argv = require("yargs");
const Utils = require("./utils");

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
    chalk.bgRed(
      "\n Please pass your gitlab personal access token. Check README.md to how grab it. \n"
    )
  );
  process.exit(0);
}

/**
 * defining our needs.
 */
const token = argv.argv.token || "";
const baseUrl = argv.argv.url || "https://gitlab.com";
const output = argv.argv.output || "./repos";
const pagination = 100; // currently maximum gitlab pagination supports.
const defaultAddress = `/api/v4/projects?simple=true&membership=true&pagination=keyset&order_by=id&sort=asc&per_page=${pagination}`;
const bar = new cliProgress.SingleBar(
  {
    format: "progress [{bar}] {percentage}% | {value}/{total}",
  },
  cliProgress.Presets.shades_classic
);

/**
 * for saving next paginated data url.
 */
let next;

/**
 * total repository for handling progress bar.
 */
let total = 0;

/**
 * to indicate when first cloning starts.
 */
let firstStart = true;

axios.defaults.baseURL = baseUrl;
axios.defaults.headers.common["PRIVATE-TOKEN"] = token;

if (!fs.existsSync(output)) {
  fs.mkdirSync(output);
}

/**
 * listen for changes on cloned repos and we reached end of pagination or not.
 */
const observer = objChange(
  {
    cloned: 0,
    hasNext: true,
  },
  () => {
    /**
     * if we cloned all repos based on total and cloned and also there is no link for next paginated data, so we cloned all repos and should stop progress bar and cleanup message.
     */
    if (observer.cloned === total && !observer.hasNext) {
      bar.stop();
      console.clear();
      console.log(chalk.green(`\n ${total} repo(s) saved!! \n`));
    }
  }
);

/**
 * generate our uitls.
 */
const utils = new Utils({
  token,
  url: baseUrl,
  output,
  bar,
  observer,
});

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
      total += length;

      /**
       * based on gitlab pagination document, the next url to be called come here, so we grab it and save it
       * to handle our pagination process.
       */
      const { link } = res.headers;

      if (firstStart) {
        /**
         * so at the beginning of cloning we start our cli progress.
         */
        bar.start(total, 0);

        firstStart = false;
      } else {
        /**
         * we update our total repos because of in new paginated data we should update total repos.
         */
        bar.setTotal(total);
      }

      for (let i = 0; i < length; i += 1) {
        const repo = repos[i];
        const {
          name_with_namespace: nameWithNameSpace,
          http_url_to_repo: httpUrlToRepo,
        } = repo;

        const repoName = Utils.generateRepoName(nameWithNameSpace);
        const repoNameColor = Utils.generateRepoNameColorized(repoName);
        const repoUrl = utils.generateRepoUrl(httpUrlToRepo);

        /**
         * if we had already cloned this repo, we do action after cloning a repo without showing any message to update our process.
         */
        if (utils.isRepoExist(repoName)) {
          utils.cloneCompleted(repoNameColor, false);
        } else {
          /**
           * we start cloning the repo
           */
          console.log(chalk.yellow(`\n cloning ${repoNameColor} ... \n`));

          clone(`${repoUrl}`, `${output}/${repoName}`, undefined, () => {
            /**
             * here again, check if clone completed, do action after completing clone.
             */
            if (utils.isRepoExist(repoName)) {
              utils.cloneCompleted(repoNameColor);
            }
          });
        }
      }

      /**
       * handle pagination.
       * based on gitlab document, if our array length is 0 and link also is no absence then we have all of our repos data.
       */
      if (length !== 0 && link) {
        next = link.replace("<http", "http").replace(`>; rel="next"`, "");

        /**
         * after saving next url that should be called, we call again our main function.
         */
        main();
      } else {
        /**
         * if we don't have any other repos, so we stop our pagination process.
         */
        observer.hasNext = false;
      }
    })
    .catch((err) => {
      console.log(`\n ${chalk.red(`trace: ${err.stack}`)} \n`);
      process.exit(0);
    });
}

main();
