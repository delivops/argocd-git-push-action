import * as core from '@actions/core'
import * as github from '@actions/github'
import * as fs from 'fs'
import * as yaml from 'yaml'

export function getInputs(): {
  readonly clusterName: string
  readonly applications: string
  readonly projectName: string
  readonly githubToken: string
  readonly tag: string
  readonly branchName: string
} {
  return {
    clusterName: core.getInput('cluster_name', { required: true }),
    applications: core.getInput('applications', { required: true }),
    projectName: core.getInput('project_name', { required: true }),
    githubToken: core.getInput('github-token', { required: true }),
    tag: core.getInput('tag', { required: true }),
    branchName: process.env.GITHUB_HEAD_REF || 'main'
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

async function updateApplicationTagInFile(filePath: string, tag: string) {
  try {
    const fileContents = fs.readFileSync(filePath, { encoding: 'utf8' })
    const data = yaml.parseDocument(fileContents)
    const imageTagPath = 'spec.source.helm.valuesObject.image.tag'
    const imageTagNode = data.getIn(imageTagPath.split('.'))
    if (imageTagNode) {
      data.setIn(imageTagPath.split('.'), tag)
      const newYaml = data.toString()
      fs.writeFileSync(filePath, newYaml, { encoding: 'utf8' })
    } else {
      throw new Error(`The path ${imageTagPath} does not exist in ${filePath}`)
    }
  } catch (error) {
    core.setFailed(
      `Failed to update application tag in file ${filePath}: ${(error as Error).message}`
    )
  }
}

export async function commitAndPushChanges(
  filesPath: string[],
  branchName: string,
  message: string,
  githubToken: string
): Promise<void> {
  try {
    const { owner, repo } = github.context.repo
    const octokit = github.getOctokit(githubToken)
    const g = octokit.rest.git
    const ref = `heads/${branchName}`
    const {
      data: {
        object: { sha: commit_sha }
      }
    } = await g.getRef({ owner, repo, ref })
    const {
      data: {
        tree: { sha: base_tree }
      }
    } = await g.getCommit({ owner, repo, commit_sha })
    const filesTree = filesPath.map(path => {
      return {
        path,
        mode: '100644' as const,
        type: 'blob' as const,
        content: fs.readFileSync(path).toString('base64')
      }
    })
    const {
      data: { sha: tree }
    } = await g.createTree({ owner, repo, base_tree, tree: filesTree })
    const {
      data: { sha }
    } = await g.createCommit({
      owner,
      repo,
      message,
      tree,
      parents: [commit_sha]
    })
    await g.updateRef({ owner, repo, ref, sha })
  } catch (error) {
    core.setFailed(
      `Failed to commit and push changes: ${(error as Error).message}`
    )
  }
}
