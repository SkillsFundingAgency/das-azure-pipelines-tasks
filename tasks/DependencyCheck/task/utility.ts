import * as fs from 'fs';
import * as cp from 'child_process';

import emoji = require('node-emoji');
import tl = require('azure-pipelines-task-lib/task');
import http = require('https');
import path = require('path');
import { ContainerClient, AnonymousCredential } from "@azure/storage-blob";

export function cleanDependencyCheckData(): void {
  const p = path.join(__dirname, 'dependency-check-cli', 'data');
  try {
    tl.checkPath(p, 'Dependency check cli data folder');
    tl.rmRF(p);
  } catch (e) {
    tl.debug(`An error was caught during cleanup ${e}`);
    tl.warning(`Data path did not exist. The task will attempt to create it at: ${p}`);
  }

  tl.mkdirP(p);
}

export async function downloadVulnData(readStorageAccountContainerSasUri: string, filePath: string, taskVersion: string): Promise<void> {
  const file = fs.createWriteStream(filePath);
  const anonymousCredential = new AnonymousCredential();
  const blobServiceClient = new ContainerClient(
    `${readStorageAccountContainerSasUri}`,
    anonymousCredential
  );
  const blobName = `${taskVersion}/${path.basename(filePath)}`;
  const blockBlobClient = blobServiceClient.getBlockBlobClient(blobName);
  return new Promise<void>((resolve, reject) => {
    try {
      blockBlobClient.downloadToFile(filePath)
        .then(() => console.log(`Successful download of vulnerability data file ${blobName}`))
        .catch((e) => reject(new Error(`Download of vulnerability data file ${blobName} failed with error code: ${e.message}`)))
        .finally(resolve)
    }
    catch (e) {
      reject(new Error(`Download of vulnerability data file ${blobName} failed with error code: ${e.message}`));
    }
  });
}

export async function UploadVulnData(writeStorageAccountContainerSasUri: string, filePath: string, taskVersion: string): Promise<void> {
  const anonymousCredential = new AnonymousCredential();
  const blobServiceClient = new ContainerClient(
    `${writeStorageAccountContainerSasUri}`,
    anonymousCredential
  );
  const file = fs.readFileSync(filePath);
  const blobName = `${taskVersion}/${path.basename(filePath)}`;
  const blockBlobClient = blobServiceClient.getBlockBlobClient(blobName);
  return new Promise<void>((resolve, reject) => {
    try {
      blockBlobClient.upload(file, Buffer.byteLength(file))
        .then(() => console.log(`Successful upload of vulnerability data file ${blobName}`))
        .catch((e) => reject(new Error(`Failed upload of vulnerability data file ${blobName} with error code: ${e.message}`)))
        .finally(resolve)
    }
    catch (e) {
      reject(new Error(`Upload of vulnerability data file ${blobName} failed with error code: ${e.message}`));
    }
  });
}

export async function owaspCheck(scriptPath: string, scanPath: string, excludedScanPathPatterns: string, resultsPath: string, enableSelfHostedVulnerabilityFiles: boolean): Promise<string> {
  const projectName = 'OWASP Dependency Check';
  const format = 'CSV';
  tl.debug(`OWASP scan directory set to ${scanPath}`);
  // Log warning if new version of dependency-check CLI is available

  const args = enableSelfHostedVulnerabilityFiles ? ['--project', projectName, '--scan', scanPath, '--exclude', excludedScanPathPatterns, '--out', resultsPath, '--format', format, '--noupdate'] :
    ['--project', projectName, '--scan', scanPath, '--exclude', excludedScanPathPatterns, '--out', resultsPath, '--format', format]

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
