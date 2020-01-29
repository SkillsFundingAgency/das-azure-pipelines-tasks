/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import tl = require('azure-pipelines-task-lib/task');

async function run() {
  try {
    const inputString: string | undefined = tl.getInput('samplestring', true);
    if (inputString === 'bad') {
      tl.setResult(tl.TaskResult.Failed, 'Bad input was given');
      return;
    }
    console.log('Hello', inputString);
  } catch (err) {
    tl.setResult(tl.TaskResult.Failed, err.message);
  }
}

run();
