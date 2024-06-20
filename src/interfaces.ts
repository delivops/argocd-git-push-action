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

export type RestGitClient = ReturnType<(typeof github)['getOctokit']>['rest']['git']
