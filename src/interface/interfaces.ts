import type * as github from '@actions/github'

export interface Inputs {
  clusterName: string
  applications: string
  projectName: string
  githubToken: string
  tag: string
  branchName: string
  retries: string
}

export interface GithubContext {
  owner: string
  repo: string
  octokit: ReturnType<typeof github.getOctokit>
  g: ReturnType<typeof github.getOctokit>['rest']['git']
}

export type RestGitClient = ReturnType<(typeof github)['getOctokit']>['rest']['git']
