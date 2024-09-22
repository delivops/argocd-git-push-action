
import * as github from '@actions/github'
import { GithubContext } from '../interface/interfaces'

export const getGithubContext = (githubToken: string): GithubContext => {
  const { owner, repo } = github.context.repo
  const octokit = github.getOctokit(githubToken)
  const g = octokit.rest.git
  return { owner, repo, octokit, g }
}
