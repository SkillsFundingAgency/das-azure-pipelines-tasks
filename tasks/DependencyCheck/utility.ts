import * as fs from 'fs';
import * as cp from 'child_process';
import { BlobServiceClient } from "@azure/storage-blob";

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

export async function getVulnData(storageAccountName: string, blobName: string, filePath: string): Promise<void> {
  const file = fs.createWriteStream(filePath);
  const blobServiceClient = new BlobServiceClient(
    `https://${storageAccountName}.blob.core.windows.net`
  );
  const containerClient = blobServiceClient.getContainerClient('cache');
  const blobClient = containerClient.getBlobClient(blobName);
  const downloadBlockBlobResponse = await blobClient.download();
  return new Promise<void>((resolve, reject) => {
    downloadBlockBlobResponse.readableStreamBody?.pipe(file)
      console.log(`${emoji.get('timer_clock')}  Downloading file [${blobName}]`);
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
}

export async function owaspCheck(scriptPath: string, scanPath: string): Promise<string> {
  const projectName = 'OWASP Dependency Check';
  const format = 'CSV';
  tl.debug(`OWASP scan directory set to ${scanPath}`);
  // Log warning if new version of dependency-check CLI is available

  const args = ['--project', projectName, '--scan', scanPath, '--format', format, '--noupdate'];

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
