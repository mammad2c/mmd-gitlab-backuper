const chalk = require("chalk");
const fs = require("fs-extra");
const shell = require("shelljs");
const Utils = require("./utils");

/**
 * this function handle cloning repositories.
 * @param {array} repos repositories required for clone.
 * @param {object} utils utils instance.
 * @param {object} bar cli progress bar instance.
 * @param {object} scriptOptions pass cli arguments.
 */
const getRrepos = async (repos = [], utils, bar, scriptOptions = {}) => {
  /**
   * handle if there is no repository exists on given gitlab url.
   */
  if (repos.length === 0) {
    console.log(
      chalk.yellow(
        `\nYou don't have any repositories on ${scriptOptions.baseUrl} \n`
      )
    );
    process.exit(0);
  }

  console.log(chalk.green("\nStart cloning ... \n"));

  if (!fs.existsSync(scriptOptions.output)) {
    fs.mkdirSync(scriptOptions.output);
  }

  const notClonedRepos = repos.filter((item) => {
    const repoName = Utils.generateRepoName(item.name_with_namespace);
    return !utils.isRepoExist(repoName);
  });

  bar.start(repos.length, 0);
  bar.update(repos.length - notClonedRepos.length);

  for (let i = 0; i < notClonedRepos.length; i += 1) {
    const repo = notClonedRepos[i];
    const {
      name_with_namespace: nameWithNameSpace,
      http_url_to_repo: httpUrlToRepo,
    } = repo;

    const repoName = Utils.generateRepoName(nameWithNameSpace);
    const repoNameColor = Utils.generateRepoNameColorized(repoName);
    const repoUrl = utils.generateRepoUrl(httpUrlToRepo);
    const command = `git clone ${repoUrl} "${scriptOptions.output}/${repoName}" --progress`;

    console.log(chalk.yellow(`\ncloning ${repoNameColor} \n`));

    await new Promise((resolve, reject) => {
      shell.exec(command, (code, stdout, stderr) => {
        if (code === 0) {
          utils.cloneCompleted(repoName);
          resolve();
        } else {
          reject(new Error(stderr));
        }
      });
    });
  }

  return true;
};

module.exports = getRrepos;
