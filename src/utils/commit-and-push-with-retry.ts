import * as core from '@actions/core'
import * as github from '@actions/github'
import { BackoffOptions, backOff } from 'exponential-backoff'
import { config } from '../config'
import { commitAndPushChanges } from './commit-and-push-changes'

export async function commitAndPushWithRetry(
  filesPath: string[],
  branchName: string,
  message: string,
  githubToken: string,
  retries: string
): Promise<void> {
  const { owner, repo } = github.context.repo
  const octokit = github.getOctokit(githubToken)
  const g = octokit.rest.git
  const ref = `heads/${branchName}`
  const maxAttempts = parseInt(retries, 10) + 1 // Include the initial attempt

  const options: BackoffOptions = {
    numOfAttempts: maxAttempts, // Include the initial attempt
    startingDelay: 1000 * config.BASE_BACKOFF_TIME_IN_SEC, // 5 seconds
    delayFirstAttempt: false,
    timeMultiple: 2,
    jitter: 'full',
    retry: async (error, attemptNumber) => {
      core.warning(`Attempt ${attemptNumber} failed with error: ${error}`)
      core.info(`Retrying... (${maxAttempts - attemptNumber} attempt(s) remaining)`)
      return true // Retry on all errors
    }
  }
  const runCommitAndPushChanges = async (): Promise<void> =>
    await commitAndPushChanges(g, owner, repo, ref, filesPath, message)

  try {
    await backOff(runCommitAndPushChanges, options)
  } catch (error) {
    core.setFailed(`Failed to commit and push changes after ${maxAttempts} attempts: ${error}`)
  }
}
