import * as core from '@actions/core'
import * as github from '@actions/github'
import * as backoff from 'exponential-backoff'
import { commitAndPushChanges, commitAndPushWithRetries } from '../src/utils/commit-and-push-changes'

jest.mock('@actions/core')
jest.mock('@actions/github')
jest.mock('exponential-backoff')
jest.mock('../src/utils/commit-and-push-changes')

const mockCommitAndPushChanges = (
  commitAndPushChanges as jest.MockedFunction<typeof commitAndPushChanges>
).mockImplementation()

describe('commitAndPush', () => {
  const filesPath = ['file1.txt', 'file2.txt']
  const branchName = 'test-branch'
  const message = 'Test commit'
  const githubToken = 'github-token'
  const retries = '3'

  beforeEach(() => {
    jest.resetAllMocks()

    const mockOctokit = {
      rest: {
        git: {
          // mock the necessary git operations
        }
      }
    }

    ;(github.getOctokit as jest.Mock).mockReturnValue(mockOctokit)
    ;(github.context.repo as jest.Mocked<typeof github.context.repo>) = {
      owner: 'test-owner',
      repo: 'test-repo'
    }
  })

  it('should commit and push changes with retries', async () => {
    mockCommitAndPushChanges.mockImplementation(async () => Promise.resolve())
    const mockBackOff = jest.spyOn(backoff, 'backOff').mockImplementation(async fn => fn())

    await commitAndPushWithRetries(filesPath, branchName, message, githubToken, retries)

    expect(core.warning).not.toHaveBeenCalled()
    expect(core.info).not.toHaveBeenCalled()
    expect(core.setFailed).not.toHaveBeenCalled()
    expect(mockCommitAndPushChanges).toHaveBeenCalledTimes(1)
    expect(mockBackOff).toHaveBeenCalledTimes(1)
  })

  it('should fail after maximum attempts', async () => {
    const maxAttempts = parseInt(retries, 10) + 1 // Include the initial attempt
    const mockError = new Error('Commit and push failed')

    mockCommitAndPushChanges.mockRejectedValueOnce(mockError)
    const mockBackOff = jest.spyOn(backoff, 'backOff').mockImplementation(async (fn, options) => {
      const { numOfAttempts = 0, retry } = options || ({} as backoff.BackoffOptions)
      for (let i = 0; i < numOfAttempts; i++) {
        try {
          await fn()
        } catch (error) {
          if (retry) {
            const shouldRetry = await retry(error, i + 1)
            if (!shouldRetry) {
              throw error
            }
          } else {
            throw error
          }
        }
      }
      throw new Error('Maximum attempts reached')
    })

    await commitAndPushWithRetries(filesPath, branchName, message, githubToken, retries)

    expect(mockBackOff).toHaveBeenCalledTimes(1)
    expect(mockCommitAndPushChanges).toHaveBeenCalledTimes(maxAttempts)
    expect(core.setFailed).toHaveBeenCalledTimes(1)
    expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('Failed'))
  })
})
