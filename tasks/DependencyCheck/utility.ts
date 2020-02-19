import * as request from 'request-promise-native';
import { promises as fs } from 'fs';
import * as cp from 'child_process';

import emoji = require('node-emoji');
import tl = require('azure-pipelines-task-lib/task');

export function cleanDependencyCheckData(): void {
  const path = `${__dirname}/dependency-check-cli/data`;
  try {
    tl.checkPath(path, 'Dependency check cli data folder');
    tl.rmRF(path);
  } catch (e) {
    console.warn(`Data path did not exist. The task will attempt to create it at: ${path}`);
  }

  tl.mkdirP(path);
}

export async function getVulnData(vulnUrl: string, filePath: string): Promise<void> {
  const options = {
    url: vulnUrl,
    resolveWithFullResponse: true,
  };

  const response = await request.get(options);
  await fs.writeFile(filePath, response.body)
    .then((r) => console.log(`${emoji.get('heavy_check_mark')} File download complete for ${filePath}.`))
    .catch((e) => tl.error(e));
}

export async function owaspCheck(scriptPath: string): Promise<string> {
  const projectName = 'OWASP Dependency Check';
  const format = 'CSV';
  const scanPath: string = tl.getVariable('Agent.BuildDirectory') || 'C:/Users/craig/code/das-tools-service';
  tl.debug(`OWASP scan directory set to ${scanPath}`);
  // Log warning if new version of dependency-check CLI is available

  const args = ['--project', projectName, '--scan', scanPath, '--format', format];

  console.log(`${emoji.get('lightning')} Executing dependency-check-cli.`);
  tl.debug(`Cli args: ${args.join(' ')}`);

  return new Promise<string>((resolve, reject) => {
    const p = cp.spawn(scriptPath, args);

    p.stdout.on('data', (data) => {
      tl.error(`${data}`);
    });

    p.on('close', (c) => {
      if (c > 0) {
        reject(new Error(`OWASP scan failed with exit code: ${c}`));
      } else {
        resolve();
      }
    });
  });
}
