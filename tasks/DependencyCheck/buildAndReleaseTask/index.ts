import tl = require('azure-pipelines-task-lib/task');
import { LogAnalyticsClient, ILogAnalyticsClient } from './log-analytics';
import { resolve } from 'dns';
import path = require('path')
import * as request from 'request-promise-native';
import { promises as fs } from 'fs';
import * as cp from 'child_process';

var child_process = require('child_process');

tl.setResourcePath(path.join(__dirname, 'task.json'));

const logType = 'DependencyCheck';

var workspaceId : string = tl.getInput('workspaceId', true)!;
var sharedKey: string = tl.getInput('sharedKey', true)!;

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

  let cliScript = "";
  if (process.platform === "linux") {
    cliScript = require.resolve('./dependency-check-cli/bin/dependency-check.sh');
    const editPermission = cp.spawnSync('chmod', ['+x', cliScript])
  }
  else if (process.platform === "win32") {
    cliScript = require.resolve('./dependency-check-cli/bin/dependency-check.bat');
  }

  async function getVulnData(vulnUrl: string, filePath: string) {
    const options = {
      url: vulnUrl,
      resolveWithFullResponse: true,
    };
    console.log('Writing file')

    const response = await request.get(options)
      .then((r: any) => (
        fs.writeFile(filePath, r.body)
      ))
      .catch((err: any) => ({
        name: err.name,
        stausCode: err.statusCode,
        message: err.resonse ? err.response : JSON.parse(err.response.body),
      }));

    return response;
  }


  function owaspCheck() {
    const projectName = "OWASP Dependency Check"
    const format = "CSV"

    var scanPath: string = tl.getVariable('Agent.BuildDirectory')!;

    //Log warning if new version of dependency-check CLI is available

    console.log("owaspcheck()");
    const process = cp.spawnSync(cliScript, ['--project', projectName, '--scan', scanPath, '--format', format, '--no-update']);
    /*Debugging when spawn:
    process.stderr.setEncoding('utf8');
    process.stdout.on('data', (d) => {
      console.log(d.toString());
    })*/
  }

  await getVulnData('https://<storage-account>.blob.core.windows.net/cache/odc.mv.db', './dependency-check-cli/data/odc.mv.db')
  await getVulnData('https://<storage-account>.blob.core.windows.net/cache/jsrepository.json', './dependency-check-cli/data/jsrepository.json')

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
