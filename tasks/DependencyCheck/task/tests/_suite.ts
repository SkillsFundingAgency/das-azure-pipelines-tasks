/* eslint-disable no-console */
import * as path from 'path';
import * as assert from 'assert';
import * as ttm from 'azure-pipelines-task-lib/mock-test';

describe('Sample task tests', () => {
  before(() => {

  });

  after(() => {

  });

  it('should succeed with simple inputs', function f(done: MochaDone) {
    this.timeout(1000);

    const tp = path.join(__dirname, 'success.js');
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.run();
    console.log(tr.succeeded);
    assert.equal(tr.succeeded, true, 'should have succeeded');
    assert.equal(tr.warningIssues.length, 0, 'should have no warnings');
    assert.equal(tr.errorIssues.length, 0, 'should have no errors');
    console.log(tr.stdout);
    assert.equal(tr.stdout.includes('Hello human'), true, 'should display Hello human');
    done();
  });

  it('it should fail if tool returns 1', function f(done: MochaDone) {
    this.timeout(1000);

    const tp = path.join(__dirname, 'failure.js');
    const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

    tr.run();
    console.log(tr.succeeded);
    assert.equal(tr.succeeded, false, 'should have failed');
    assert.equal(tr.warningIssues, 0, 'should have no warnings');
    assert.equal(tr.errorIssues.length, 1, 'should have 1 error issue');
    assert.equal(tr.errorIssues[0], 'Bad input was given', 'error issue output');
    assert.equal(tr.stdout.indexOf('Hello bad'), -1, 'Should not display Hello bad');

    done();
  });
});
