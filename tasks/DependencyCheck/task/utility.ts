import * as fs from 'fs';
import * as cp from 'child_process';

import emoji = require('node-emoji');
import tl = require('azure-pipelines-task-lib/task');
import http = require('https');
import path = require('path');

export function cleanDependencyCheckData(): void {
  const p = path.join(__dirname, 'dependency-check-cli', 'data');
  try {
    tl.checkPath(p, 'Dependency check cli data folder');
    tl.rmRF(p);
  } catch (e) {
    tl.debug(`An error was caugh during cleanup ${e}`);
    tl.warning(`Data path did not exist. The task will attempt to create it at: ${p}`);
  }

  tl.mkdirP(p);
}

export async function getVulnData(databaseEndpoint: string, blobName: string, filePath: string): Promise<void> {
  const file = fs.createWriteStream(filePath);
  const vulnUrl = `${databaseEndpoint}/${blobName}`;
  return new Promise<void>((resolve, reject) => {
    http.get(vulnUrl, (response: any) => {
      response.pipe(file);
      console.log(`${emoji.get('timer_clock')}  Downloading file [${vulnUrl}]`);
      file.on('finish', () => {
        file.close();
        console.log(`${emoji.get('heavy_check_mark')}  File download complete!`);
        resolve();
      });

      file.on('error', (err) => {
        fs.unlink(filePath, () => { });
        reject(new Error(err));
      });
    });
  });
}

export async function owaspCheck(scriptPath: string, scanPath: string, resultsPath: string): Promise<string> {
  const projectName = 'OWASP Dependency Check';
  const format = 'CSV';
  tl.debug(`OWASP scan directory set to ${scanPath}`);
  // Log warning if new version of dependency-check CLI is available

  cp.spawnSync('chmod', ['+x', scriptPath])

  const args = ['--project', projectName, '--scan', scanPath, '--out', resultsPath, '--format', format, '--noupdate'];

  console.log(`${emoji.get('lightning')}  Executing dependency-check-cli.`);
  tl.debug(`Cli args: ${args.join(' ')}`);

  return new Promise<string>((resolve, reject) => {
    const p = cp.spawn(scriptPath, args);

    p.stdout.on('data', (data) => {
      console.log(`${data}`);
    });

    p.stderr.on('data', (data) => {
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
