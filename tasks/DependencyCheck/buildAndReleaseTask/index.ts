import tl = require('azure-pipelines-task-lib/task');
import { LogAnalyticsClient, ILogAnalyticsClient } from './log-analytics';
import { resolve } from 'dns';
import path = require('path')

tl.setResourcePath(path.join(__dirname, 'task.json'));

const logType = 'DependencyCheck';


var workspaceId : string = tl.getInput('workspaceId', true)!;
var sharedKey: string = tl.getInput('sharedKey', true)!;

const la: ILogAnalyticsClient = new LogAnalyticsClient(
  workspaceId,
  sharedKey,
);

console.log('Before main async function')

async function run(): Promise<void> {

  console.log('In main async function')

  //Set variables for dependency-check-cli arguments - https://jeremylong.github.io/DependencyCheck/dependency-check-cli/arguments.html :
  /*
  OPTIONAL:
  failOnCVSS: score set between 0 and 10
  */

  function owaspCheck() {
    const projectName = "OWASP Dependency Check"
    const format = "CSV"

    var scanPath : string = tl.getVariable('Agent.BuildDirectory')!;
    console.log('ScanPath:')
    console.log(scanPath)

    //Log warning if new version of dependency-check CLI is available


    var argumentList = "--project".concat(projectName, " --scan ", scanPath, " --format ", format)

    //Pull cached files and save to dependency-check/data:
    //https://dependencycheck.sec540.com/data/jsrepository.json saved as jsrepository.json
    //https://dependencycheck.sec540.com/data/odc.mv.db saved as odc.mv.db

    //Run dependency-check/bin/dependency-check.sh if Linux | dependency-check/bin/dependency-check.bat if Windows

    var child_process = require('child_process');
    var bat = require.resolve('./dependency-check-cli/bin/dependency-check.bat');

    console.log(bat)

    console.log('Before run of .bat file')
    var report = child_process.spawnSync(bat, ['--project', projectName, '--scan', scanPath, '--format', format]);
    console.log('After run of .bat file')
  }

  console.log('Before owaspCheck() function')
  owaspCheck()
  console.log('After owaspCheck() function')

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
