import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');

const inputs = [
  'workspaceId',
  'sharedKey',
  'enableSelfHostedDatabase',
  'databaseEndpoint',
  'scanPath',
];

const taskPath = path.join(__dirname, '..', 'index.js');
const dependencyCheckDataPath = path.join(__dirname, '..', 'dependency-check-cli', 'data');
console.log(dependencyCheckDataPath);
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);
const missingVars: string[] = [];

tmr.setAnswers(
  {
    checkPath: { [dependencyCheckDataPath]: true },
    rmRF: { [dependencyCheckDataPath]: { success: true } },
  },
);

tmr.setVariableName("Build.Repository.Name", "SkillsFundingAgency/das-repository", false);
tmr.setVariableName("Build.SourceBranchName", "example-branch", false);
tmr.setVariableName("Build.DefinitionName", "example-build", false);
tmr.setVariableName("Build.BuildNumber", "1.0.0", false);
tmr.setVariableName("Build.SourceVersion", "48a815313fd34299aad897920f84bd44c4adcf05", false);

inputs.forEach((i) => {
  console.log(` -> Setting mock task input ${i}`);
  const val = process.env[i];

  if (!val || val === undefined) {
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
