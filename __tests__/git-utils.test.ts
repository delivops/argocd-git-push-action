import { RestGitClient } from '../src/interface/interfaces'
import * as GitUtils from '../src/utils/git.utils'

describe('git.utils', () => {
  describe('getLatestCommitSha', () => {
    it('should return the latest commit SHA', async () => {
      const mockG = {
        getRef: jest.fn().mockResolvedValue({
          data: {
            object: { sha: 'latest-sha' }
          }
        })
      }
      const owner = 'test-owner'
      const repo = 'test-repo'
      const ref = 'heads/main'

      const result = await GitUtils.getLatestCommitSha(mockG as unknown as RestGitClient, owner, repo, ref)

      expect(mockG.getRef).toHaveBeenCalledWith({ owner, repo, ref })
      expect(result).toBe('latest-sha')
    })
  })
})

describe('getBaseTree', () => {
  it('should return the base tree SHA', async () => {
    const mockG = {
      getCommit: jest.fn().mockResolvedValue({
        data: {
          tree: { sha: 'base-tree-sha' }
        }
      })
    }
    const owner = 'test-owner'
    const repo = 'test-repo'
    const commitSha = 'commit-sha'

    const result = await GitUtils.getBaseTree(mockG as unknown as RestGitClient, owner, repo, commitSha)

    expect(mockG.getCommit).toHaveBeenCalledWith({ owner, repo, commit_sha: commitSha })
    expect(result).toBe('base-tree-sha')
  })

  it('should throw an error when getCommit fails', async () => {
    const mockG = {
      getCommit: jest.fn().mockRejectedValue(new Error('getCommit error'))
    }
    const owner = 'test-owner'
    const repo = 'test-repo'
    const commitSha = 'commit-sha'

    await expect(GitUtils.getBaseTree(mockG as unknown as RestGitClient, owner, repo, commitSha)).rejects.toThrow(
      'getCommit error'
    )
  })
})
