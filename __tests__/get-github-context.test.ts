import * as github from '@actions/github'
import { getOctokit, getRepoContext, getGithubContext } from '../src/utils/get-github-context'

jest.mock('@actions/github')

describe('get-github-context', () => {
  const mockToken = 'test-token'
  const mockOwner = 'test-owner'
  const mockRepo = 'test-repo'

  beforeEach(() => {
    jest.resetAllMocks()
    ;(github.context.repo as jest.Mocked<typeof github.context.repo>) = {
      owner: mockOwner,
      repo: mockRepo
    }
  })

  describe('getOctokit', () => {
    it('should return an Octokit instance', () => {
      const mockOctokit = { rest: { git: {} } }
      ;(github.getOctokit as jest.Mock).mockReturnValue(mockOctokit)

      const result = getOctokit(mockToken)

      expect(github.getOctokit).toHaveBeenCalledWith(mockToken)
      expect(result).toBe(mockOctokit)
    })
  })

  describe('getRepoContext', () => {
    it('should return the owner and repo from github context', () => {
      const result = getRepoContext()

      expect(result).toEqual({ owner: mockOwner, repo: mockRepo })
    })
  })

  describe('getGithubContext', () => {
    it('should return the full GitHub context', () => {
      const mockOctokit = { rest: { git: {} } }
      ;(github.getOctokit as jest.Mock).mockReturnValue(mockOctokit)

      const result = getGithubContext(mockToken)

      expect(result).toEqual({
        owner: mockOwner,
        repo: mockRepo,
        octokit: mockOctokit,
        g: mockOctokit.rest.git
      })
    })
  })
})
