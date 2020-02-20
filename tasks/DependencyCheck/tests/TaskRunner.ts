import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');

const inputs = [
  'workspaceId',
  'sharedKey',
  'selfHostedDatabase',
  'storageAccountName',
  'scanPath',
];

const taskPath = path.join(__dirname, '..', 'index.js');
const dependencyCheckDataPath = `${__dirname}/dependency-check-cli/data`;
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);
const missingVars: string[] = [];

tmr.setAnswers(
  {
    checkPath: { [dependencyCheckDataPath]: true },
    rmRF: { [dependencyCheckDataPath]: { success: true } },
  },
);

inputs.forEach((i) => {
  console.log(` -> Setting mock task input ${i}`);
  const val = process.env[i];

  if (!val || val === undefined) {
    console.log('here');
    missingVars.push(i);
  } else {
    tmr.setInput(i, val);
  }
});

if (missingVars.length > 0) {
  console.error(`Could not find required inputs for task to complete, check your env for [${missingVars.join(',')}]`);
} else {
  tmr.run();
}
