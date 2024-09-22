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

      const result = await GitUtils.getLatestCommitSha(mockG as any, owner, repo, ref)

      expect(mockG.getRef).toHaveBeenCalledWith({ owner, repo, ref })
      expect(result).toBe('latest-sha')
    })
  })
})
