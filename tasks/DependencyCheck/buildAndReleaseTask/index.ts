import tl = require('azure-pipelines-task-lib/task');
import { LogAnalyticsClient, ILogAnalyticsClient } from './log-analytics';
import { resolve } from 'dns';
import path = require('path')

tl.setResourcePath(path.join(__dirname, 'task.json'));

const logType = 'DependencyCheck';

var workspaceId : string = tl.getInput('workspaceId', true)!;
var sharedKey: string = tl.getInput('sharedKey', true)!;

var child_process = require('child_process');

const la: ILogAnalyticsClient = new LogAnalyticsClient(
  workspaceId,
  sharedKey,
);

async function run(): Promise<void> {

  //Set variables for dependency-check-cli arguments - https://jeremylong.github.io/DependencyCheck/dependency-check-cli/arguments.html :
  /*
  OPTIONAL:
  failOnCVSS: score set between 0 and 10
  */

  if (process.platform === "linux") {
    var cliScript = require.resolve('./dependency-check-cli/bin/dependency-check.sh');
    var editPermission = child_process.spawnSync('chmod', ['+x', cliScript])
  }
  else if (process.platform === "win32") {
    var cliScript = require.resolve('./dependency-check-cli/bin/dependency-check.bat');
  }

  function owaspCheck() {
    const projectName = "OWASP Dependency Check"
    const format = "CSV"

    var scanPath : string = tl.getVariable('Agent.BuildDirectory')!;

    //Log warning if new version of dependency-check CLI is available

    //Pull cached files and save to dependency-check/data:
    //https://dependencycheck.sec540.com/data/jsrepository.json saved as jsrepository.json
    //https://dependencycheck.sec540.com/data/odc.mv.db saved as odc.mv.db


    var report = child_process.spawnSync(cliScript, ['--project', projectName, '--scan', scanPath, '--format', format]);
  }

  owaspCheck()

  const csvFilePath = './dependency-check-report.csv'

  const csv = require('csvtojson')
  const json = await csv()
    .fromFile(csvFilePath)
    .subscribe((jsonObj: any) => {
      return new Promise((resolve, reject) => {
        jsonObj.myNewKey = 'some value';
        resolve();
      })
    })
  console.log(json)

  await la.sendLogAnalyticsData(
    JSON.stringify(json), logType, new Date().toISOString(),
  ).then(((res) => {
    console.log(res);
  })).catch(((err) => {
    console.error(err);
  }));
}

run();
