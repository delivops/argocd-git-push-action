import * as core from '@actions/core'
import * as github from '@actions/github'
import { readFile, writeFile } from 'fs/promises'
import * as yaml from 'yaml'
import * as CommitAndPushUtils from './commit-and-push-utils'
import { Inputs } from './interfaces'

export function getInputs(): Inputs {
  return {
    clusterName: core.getInput('cluster_name', { required: true }),
    applications: core.getInput('applications', { required: true }),
    projectName: core.getInput('project_name', { required: true }),
    githubToken: core.getInput('github-token', { required: true }),
    tag: core.getInput('tag', { required: true }),
    branchName: process.env.GITHUB_HEAD_REF || 'main',
    retries: core.getInput('retries') || '1'
  } as const
}

export async function updateYamlFiles(
  clusterName: string,
  projectName: string,
  applications: string,
  tag: string
): Promise<string[]> {
  const filesPath: string[] = []

  for (const application of applications.split(';')) {
    core.info(`Updating application ${application} file.`)
    const applicationFilePath = `env/${clusterName}/${projectName}/${application}.yaml`
    updateApplicationTagInFile(applicationFilePath, tag)
    filesPath.push(applicationFilePath)
  }

  return filesPath
}

async function updateApplicationTagInFile(filePath: string, tag: string): Promise<void> {
  const encoding = 'utf-8'

  try {
    const fileContents = await readFile(filePath, encoding)
    const data = yaml.parseDocument(fileContents)
    const imageTagPath = 'spec.source.helm.valuesObject.image.tag'
    const imageTagNode = data.getIn(imageTagPath.split('.'))

    if (imageTagNode) {
      data.setIn(imageTagPath.split('.'), tag)
      const newYaml = data.toString()
      core.info(`New YAML content for ${filePath}: \n${newYaml}`)
      await writeFile(filePath, newYaml, encoding)
    } else {
      throw new Error(`The path ${imageTagPath} does not exist in ${filePath}`)
    }
  } catch (error) {
    core.setFailed(`Failed to update application tag in file ${filePath}: ${(error as Error).message}`)
  }
}

export async function commitAndPushChanges(
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

  let attempt = 0
  const maxAttempts = parseInt(retries, 10)

  while (attempt < maxAttempts) {
    try {
      attempt++
      core.info(`Attempt ${attempt} to commit and push changes.`)

      const commitSha = await CommitAndPushUtils.getLatestCommitSha(g, owner, repo, ref)
      const baseTree = await CommitAndPushUtils.getBaseTree(g, owner, repo, commitSha)
      const treeSha = await CommitAndPushUtils.createFilesTree(g, owner, repo, filesPath, baseTree)
      const commitShaNew = await CommitAndPushUtils.createCommit(g, owner, repo, message, treeSha, commitSha)
      const latestSha = await CommitAndPushUtils.getLatestCommitSha(g, owner, repo, ref)

      if (latestSha !== commitSha) {
        await CommitAndPushUtils.rebaseAndPush(g, owner, repo, ref, treeSha, latestSha, message)
      } else {
        await g.updateRef({ owner, repo, ref, sha: commitShaNew })
      }

      core.info(`Successfully committed and pushed changes on attempt ${attempt}.`)
      return
    } catch (error) {
      if (attempt >= maxAttempts) {
        core.setFailed(`Failed to commit and push changes after ${maxAttempts} attempts: ${(error as Error).message}`)
        return
      }

      const backoffTime = CommitAndPushUtils.calculateBackoffTime(attempt)
      core.warning(`Attempt ${attempt} failed. Retrying in ${backoffTime} seconds...`)
      await new Promise(resolve => setTimeout(resolve, backoffTime * 1000))
    }
  }
}
