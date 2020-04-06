import csv from 'csvtojson';
import { spawnSync } from 'child_process';
import { LogAnalyticsClient, ILogAnalyticsClient } from './log-analytics';
import { getVulnData, owaspCheck, cleanDependencyCheckData } from './utility';

import emoji = require('node-emoji');
import tl = require('azure-pipelines-task-lib/task');
import path = require('path');

const logType = 'DependencyCheck';
const csvFilePath = `${__dirname}/dependency-check-report.csv`;
tl.debug(`Temporary report csv location set to ${csvFilePath}`);

async function run(): Promise<void> {
  try {
    const taskManifestPath = path.join(__dirname, 'task.json');
    tl.debug(`Setting resource path to ${taskManifestPath}`);
    tl.setResourcePath(taskManifestPath);

    const workspaceId: string = tl.getInput('workspaceId', true) as string;
    const sharedKey: string = tl.getInput('sharedKey', true) as string;
    const enableSelfHostedDatabase: boolean = tl.getBoolInput('enableSelfHostedDatabase', true);
    const databaseEndpoint: string = tl.getInput('databaseEndpoint', (enableSelfHostedDatabase)) as string;
    const scanPath: string = tl.getInput('scanPath', true) as string;

    let repositoryName = (tl.getVariable('Build.Repository.Name'))?.split('/')[1];
    let branchName = tl.getVariable('Build.SourceBranchName');
    let buildName = tl.getVariable('Build.DefinitionName');
    let buildNumber = tl.getVariable('Build.BuildNumber');
    let commitId = tl.getVariable('Build.SourceVersion');

    const la: ILogAnalyticsClient = new LogAnalyticsClient(
      workspaceId,
      sharedKey,
    );

    const scriptBasePath = `${__dirname}/dependency-check-cli/bin/dependency-check`;
    const scriptFullPath = process.platform === 'win32' ? `${scriptBasePath}.bat` : `${scriptBasePath}.sh`;
    tl.debug(`Dependency check script path set to ${scriptFullPath}`);

    if (!(process.platform === 'win32')) {
      spawnSync('chmod', ['+x', scriptFullPath])
    }

    if (enableSelfHostedDatabase) {
      const trimmedDatabaseEndpoint = databaseEndpoint.replace(/\/$/, '');
      cleanDependencyCheckData();
      await getVulnData(trimmedDatabaseEndpoint, 'odc.mv.db', `${__dirname}/dependency-check-cli/data/odc.mv.db`);
      await getVulnData(trimmedDatabaseEndpoint, 'jsrepository.json', `${__dirname}/dependency-check-cli/data/jsrepository.json`);
    }

    await owaspCheck(scriptFullPath, scanPath, csvFilePath, enableSelfHostedDatabase);

    const payload = await csv()
      .fromFile(csvFilePath)
      .subscribe((jsonObj: any) => {
        return new Promise((resolve, reject) => {
          jsonObj.RepositoryName = repositoryName;
          jsonObj.BranchName = branchName;
          jsonObj.BuildName = buildName;
          jsonObj.BuildNumber = buildNumber;
          jsonObj.CommitId = commitId;
          resolve();
        })
      })

    if (payload.length > 0) {
      await la.sendLogAnalyticsData(
        JSON.stringify(payload), logType, new Date().toISOString(),
      ).then((() => {
        const vuln = payload.length > 1 ? 'vulnerabilities' : 'vulnerability';
        tl.warning(`${emoji.get('pensive')}  A total of ${payload.length} ${vuln} were found in this project.`);
      })).catch(((e) => {
        tl.setResult(tl.TaskResult.Failed, e);
      }));
    } else {
      console.log(`${emoji.get('slightly_smiling_face')}  Good news, there are no vulnerabilities to report!`);
    }

    cleanDependencyCheckData();

    tl.setResult(tl.TaskResult.Succeeded, '');
  } catch (e) {
    tl.setResult(tl.TaskResult.Failed, e);
  }
}

run();
