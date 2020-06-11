import csv from 'csvtojson';
import { spawnSync } from 'child_process';
import { LogAnalyticsClient, ILogAnalyticsClient } from './log-analytics';
import { downloadVulnData, uploadVulnData, owaspCheck, cleanDependencyCheckData } from './utility';

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
    const logAnalyticsWorkspaceId: string = tl.getInput('logAnalyticsWorkspaceId', false) as string;
    const logAnalyticsWorkspaceKey: string = tl.getInput('logAnalyticsWorkspaceKey', false) as string;
    const enableSelfHostedVulnerabilityFiles: boolean = tl.getBoolInput('enableSelfHostedVulnerabilityFiles', false);
    const readStorageAccountContainerSasUri: string = tl.getInput('readStorageAccountContainerSasUri', false) as string;
    const scanPath: string = tl.getInput('scanPath', false) as string;
    const excludedScanPathPatterns: string = tl.getInput('excludedScanPathPatterns', false) as string;
    const severityThreshold: number = parseFloat(tl.getInput('severityThreshold', false) as string);
    const dependencyCheckDashboardUrl: string = tl.getInput('dependencyCheckDashboardUrl') as string;

    const scriptBasePath = `${__dirname}/dependency-check-cli/bin/dependency-check`;
    const scriptFullPath = process.platform === 'win32' ? `${scriptBasePath}.bat` : `${scriptBasePath}.sh`;

    tl.debug(`Dependency check script path set to ${scriptFullPath}`);

    if (!(process.platform === 'win32')) {
      spawnSync('chmod', ['+x', scriptFullPath])
    }

    if (!enableVulnerabilityFilesMaintenance) {
      let repositoryName = (tl.getVariable('Build.Repository.Provider') == 'GitHub') ? (tl.getVariable('Build.Repository.Name'))?.split('/')[1] : tl.getVariable('Build.Repository.Name');
      let branchName = tl.getVariable('Build.SourceBranchName');
      let buildName = tl.getVariable('Build.DefinitionName');
      let buildNumber = tl.getVariable('Build.BuildNumber');
      let commitId = tl.getVariable('Build.SourceVersion');

      const la: ILogAnalyticsClient = new LogAnalyticsClient(
        logAnalyticsWorkspaceId,
        logAnalyticsWorkspaceKey,
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
          tl.warning(`${emoji.get('pensive')}  A total of ${payload.length} ${vuln} were found in this project. Check the Dependency Check vulnerability dashboard for more details: ${dependencyCheckDashboardUrl}`);
        })).catch(((e) => {
          tl.setResult(tl.TaskResult.Failed, e);
        }));
      } else {
        console.log(`${emoji.get('slightly_smiling_face')}  Good news, there are no vulnerabilities to report!`);
      }

      let counter: number = 0;

      const payloadForSeverityThresholdCheck = await csv()
        .fromFile(csvFilePath)
        .subscribe((jsonObj: any) => {
          return new Promise((resolve, reject) => {
            if (parseFloat(jsonObj.CVSSv2_Score) > severityThreshold || parseFloat(jsonObj.CVSSv3_BaseScore) > severityThreshold ) {
              counter++;
            }
            if (counter > 0) {
              reject(new Error(`Severity score threshold of ${severityThreshold} has been exceeded. Check the Dependency Check vulnerability dashboard for more details: ${dependencyCheckDashboardUrl}`));
            }
            resolve();
          })
        })
    }
    else {
      await owaspCheck(scriptFullPath, scriptFullPath, excludedScanPathPatterns, csvFilePath, false);
      await uploadVulnData(writeStorageAccountContainerSasUri, `${__dirname}/dependency-check-cli/data/odc.mv.db`, taskVersion);
      await uploadVulnData(writeStorageAccountContainerSasUri, `${__dirname}/dependency-check-cli/data/jsrepository.json`, taskVersion);
    }

    cleanDependencyCheckData();

    tl.setResult(tl.TaskResult.Succeeded, '');
  } catch (e) {
    tl.setResult(tl.TaskResult.Failed, e);
  }
}

run();
