import csv from 'csvtojson';
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

    const workspaceId: string = tl.getInput('workspaceId') || process.env.workspaceId as string;
    const sharedKey: string = tl.getInput('sharedKey') || process.env.sharedKey as string;

    const selfHostedDatabase: boolean = tl.getBoolInput('selfHostedDatabase');

    // Require storageAccountName input if selfHostedDatabase is true
    const storageAccountName: string = tl.getInput('sharedKey', selfHostedDatabase) as string;

    const la: ILogAnalyticsClient = new LogAnalyticsClient(
      workspaceId,
      sharedKey,
    );

    const scriptBasePath = `${__dirname}/dependency-check-cli/bin/dependency-check`;
    const scriptFullPath = process.platform === 'win32' ? `${scriptBasePath}.bat` : `${scriptBasePath}.bat`;
    tl.debug(`Dependency check script path set to ${scriptFullPath}`);

    if (selfHostedDatabase) {
      console.log(`${emoji.get('timer_clock')} Downloading vulnerability data.`);
      cleanDependencyCheckData();
      await getVulnData(`https://${storageAccountName}.blob.core.windows.net/cache/odc.mv.db`, `${__dirname}/dependency-check-cli/data/odc.mv.db`);
      await getVulnData(`https://${storageAccountName}.blob.core.windows.net/cache/jsrepository.json`, `${__dirname}/dependency-check-cli/data/jsrepository.json`);
    }

    await owaspCheck(scriptFullPath);
    const payload = await csv().fromFile(csvFilePath);

    if (payload.length > 0) {
      await la.sendLogAnalyticsData(
        JSON.stringify(payload), logType, new Date().toISOString(),
      ).then((() => {
        console.log(`${emoji.get('pensive')} Vulnerabilities were found in this project.`);
      })).catch(((e) => {
        tl.setResult(tl.TaskResult.Failed, e);
      }));
    } else {
      console.log(`${emoji.get('slightly_smiling_face')} Good news, there are no vulnerabilities to report!`);
    }

    tl.setResult(tl.TaskResult.Succeeded, '');
  } catch (e) {
    tl.setResult(tl.TaskResult.Failed, e);
  }
}

run();
