import * as github from '@actions/github'
import { GithubContext } from '../interface/interfaces'

export const getOctokit = (githubToken: string): ReturnType<typeof github.getOctokit> => github.getOctokit(githubToken)

export const getRepoContext = (): { owner: string; repo: string } => {
  const { owner, repo } = github.context.repo
  return { owner, repo }
}

export const getGithubContext = (githubToken: string): GithubContext => {
  const { owner, repo } = getRepoContext()
  const octokit = getOctokit(githubToken)
  const g = octokit.rest.git
  return { owner, repo, octokit, g }
}
