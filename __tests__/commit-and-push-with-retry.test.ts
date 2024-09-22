import * as core from '@actions/core'
import * as github from '@actions/github'
import * as backoff from 'exponential-backoff'
import { commitAndPushWithRetries } from '../src/utils/commit-and-push-changes'
import * as GitUtils from '../src/utils/git.utils'

jest.mock('@actions/core')
jest.mock('@actions/github')
jest.mock('exponential-backoff')
jest.mock('../src/utils/git.utils')

describe('commitAndPushWithRetries', () => {
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
          getRef: jest.fn(),
          getCommit: jest.fn(),
          createBlob: jest.fn(),
          createTree: jest.fn(),
          createCommit: jest.fn(),
          updateRef: jest.fn()
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
    const mockBackOff = jest.spyOn(backoff, 'backOff').mockImplementation(async fn => fn())

    jest.spyOn(GitUtils, 'getLatestCommitSha').mockResolvedValue('latest-sha')
    jest.spyOn(GitUtils, 'getBaseTree').mockResolvedValue('base-tree')
    jest.spyOn(GitUtils, 'createFilesTree').mockResolvedValue('new-tree')
    jest.spyOn(GitUtils, 'createCommit').mockResolvedValue('new-commit')

    await commitAndPushWithRetries(filesPath, branchName, message, githubToken, retries)

    expect(mockBackOff).toHaveBeenCalledTimes(1)
    expect(GitUtils.getLatestCommitSha).toHaveBeenCalledTimes(2)
    expect(GitUtils.getBaseTree).toHaveBeenCalledTimes(1)
    expect(GitUtils.createFilesTree).toHaveBeenCalledTimes(1)
    expect(GitUtils.createCommit).toHaveBeenCalledTimes(1)
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  it('should fail after maximum attempts', async () => {
    const mockError = new Error('Commit and push failed');
    jest.spyOn(GitUtils, 'getLatestCommitSha').mockRejectedValue(mockError);
  
    const mockBackOff = jest.spyOn(backoff, 'backOff').mockImplementation(() => {
      throw new Error('Maximum attempts reached');
    });
  
    await expect(commitAndPushWithRetries(filesPath, branchName, message, githubToken, retries))
      .rejects.toThrow('Maximum attempts reached');
  
    expect(mockBackOff).toHaveBeenCalledTimes(1);
    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining('Failed to commit and push changes after 4 attempts')
    );
  });
})
