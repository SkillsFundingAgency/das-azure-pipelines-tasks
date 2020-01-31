import { LogAnalytics, ILogAnalytics, ILogAnalyticsResponse } from './log-analytics';

import tl = require('azure-pipelines-task-lib/task');

const logType = 'DependencyCheck';

async function run(): Promise<void> {
  try {
    const la: ILogAnalytics = new LogAnalytics(
      'xxxx',
      'xxxx',
    );

    const body = {
      name: 'name',
      property: 1,
      property2: 'two',
    };

    const result: ILogAnalyticsResponse = await la.sendLogAnalyticsData(
      JSON.stringify(body), logType,
    );

    if (result.stausCode !== 200) {
      tl.setResult(tl.TaskResult.Failed, result.message);
    } else {
      tl.setResult(tl.TaskResult.Succeeded, result.message);
    }
  } catch (err) {
    tl.setResult(tl.TaskResult.Failed, err.message);
  }
}

run();
