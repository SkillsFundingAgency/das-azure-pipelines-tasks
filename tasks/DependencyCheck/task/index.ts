import csv from 'csvtojson';
import { spawnSync } from 'child_process';
import { LogAnalyticsClient, ILogAnalyticsClient } from './log-analytics';
import { downloadVulnData, UploadVulnData, owaspCheck, cleanDependencyCheckData } from './utility';

import emoji = require('node-emoji');
import tl = require('azure-pipelines-task-lib/task');
import path = require('path');

const taskVersion = path.basename(__dirname);
tl.debug(`DependencyCheck task version: ${taskVersion}`);

const logType = 'DependencyCheck';
const csvFilePath = `${__dirname}/dependency-check-report.csv`;
tl.debug(`Temporary report csv location set to ${csvFilePath}`);

async function run(): Promise<void> {
  try {
    const taskManifestPath = path.join(__dirname, 'task.json');
    tl.debug(`Setting resource path to ${taskManifestPath}`);
    tl.setResourcePath(taskManifestPath);

    const enableVulnerabilityFilesMaintenance: boolean = tl.getBoolInput('enableVulnerabilityFilesMaintenance', true);
    const writeStorageAccountContainerSasUri: string = tl.getInput('writeStorageAccountContainerSasUri', false) as string;
    const workspaceId: string = tl.getInput('workspaceId', false) as string;
    const sharedKey: string = tl.getInput('sharedKey', false) as string;
    const enableSelfHostedVulnerabilityFiles: boolean = tl.getBoolInput('enableSelfHostedVulnerabilityFiles', false);
    const readStorageAccountContainerSasUri: string = tl.getInput('readStorageAccountContainerSasUri', false) as string;
    const scanPath: string = tl.getInput('scanPath', false) as string;
    const excludedScanPathPatterns: string = tl.getInput('excludedScanPathPatterns', false) as string;

    const scriptBasePath = `${__dirname}/dependency-check-cli/bin/dependency-check`;
    const scriptFullPath = process.platform === 'win32' ? `${scriptBasePath}.bat` : `${scriptBasePath}.sh`;

    tl.debug(`Dependency check script path set to ${scriptFullPath}`);

    if (!(process.platform === 'win32')) {
      spawnSync('chmod', ['+x', scriptFullPath])
    }

    if (!enableVulnerabilityFilesMaintenance) {
      let repositoryName = (tl.getVariable('Build.Repository.Name'))?.split('/')[1];
      let branchName = tl.getVariable('Build.SourceBranchName');
      let buildName = tl.getVariable('Build.DefinitionName');
      let buildNumber = tl.getVariable('Build.BuildNumber');
      let commitId = tl.getVariable('Build.SourceVersion');

      const la: ILogAnalyticsClient = new LogAnalyticsClient(
        workspaceId,
        sharedKey,
      );

      if (enableSelfHostedVulnerabilityFiles) {
        await downloadVulnData(readStorageAccountContainerSasUri, `${__dirname}/dependency-check-cli/data/odc.mv.db`, taskVersion);
        await downloadVulnData(readStorageAccountContainerSasUri, `${__dirname}/dependency-check-cli/data/jsrepository.json`, taskVersion);
      }

      await owaspCheck(scriptFullPath, scanPath, excludedScanPathPatterns, csvFilePath, enableSelfHostedVulnerabilityFiles);

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
    }
    else {
      await owaspCheck(scriptFullPath, scriptFullPath, excludedScanPathPatterns, csvFilePath, false);
      await UploadVulnData(writeStorageAccountContainerSasUri, `${__dirname}/dependency-check-cli/data/odc.mv.db`, taskVersion);
      await UploadVulnData(writeStorageAccountContainerSasUri, `${__dirname}/dependency-check-cli/data/jsrepository.json`, taskVersion);
    }

    cleanDependencyCheckData();

    tl.setResult(tl.TaskResult.Succeeded, '');
  } catch (e) {
    tl.setResult(tl.TaskResult.Failed, e);
  }
}

run();
