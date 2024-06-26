import * as core from '@actions/core'
import fs from 'fs/promises'
import * as yaml from 'yaml'
import { config } from './config'
import { Inputs } from './interfaces'

export function getInputs(): Inputs {
  const inputs = {
    clusterName: core.getInput('cluster_name', { required: true }),
    applications: core.getInput('applications', { required: true }),
    projectName: core.getInput('project_name', { required: true }),
    githubToken: core.getInput('github-token', { required: true }),
    tag: core.getInput('tag', { required: true }),
    branchName: process.env.GITHUB_HEAD_REF || 'main',
    retries: core.getInput('retries') ?? '1'
  } as const

  if (!inputs.clusterName || !inputs.applications || !inputs.projectName || !inputs.githubToken || !inputs.tag) {
    core.setFailed('Action failed with error: Missing required inputs.')
  }
  if (!parseInt(inputs.retries, 10)) {
    core.setFailed('Action failed with error: Invalid retries value.')
  }

  return inputs
}

export async function updateYamlFiles(
  clusterName: string,
  projectName: string,
  applications: string,
  tag: string
): Promise<string[]> {
  const filesPath: string[] = []
  const applicationList = splitApplications(applications)
  let foundClustersFolderName: string | null = null

  for (const application of applicationList) {
    core.info(`Updating application ${application} file.`)
    const applicationFilePath = await findValidFilePath(clusterName, projectName, application, foundClustersFolderName)
    if (applicationFilePath) {
      try {
        await updateApplicationTagInFile(applicationFilePath, tag)
        foundClustersFolderName = applicationFilePath.split('/')[0] // Save the folder name for the next iteration
      } catch (error) {
        core.setFailed(`Failed to update yaml file ${applicationFilePath}: ${error}`)
      }
      filesPath.push(applicationFilePath)
    } else {
      core.setFailed(`No valid folder found for application ${application}`)
    }
  }

  return filesPath
}

async function findValidFilePath(
  clusterName: string,
  projectName: string,
  application: string,
  knownFolderName: string | null
): Promise<string | null> {
  if (knownFolderName) {
    const filePath = `${knownFolderName}/${clusterName}/${projectName}/${application}.yaml`
    try {
      await fs.access(filePath, fs.constants.R_OK | fs.constants.W_OK)
      return filePath
    } catch (error) {
      core.warning(`File ${filePath} not accessible: ${error}`)
    }
  }

  for (const folderName of config.clustersFolderNames) {
    const filePath = `${folderName}/${clusterName}/${projectName}/${application}.yaml`
    try {
      await fs.access(filePath, fs.constants.R_OK | fs.constants.W_OK)
      return filePath
    } catch (error) {
      core.warning(`File ${filePath} not accessible: ${error}`)
    }
  }

  return null
}

async function updateApplicationTagInFile(filePath: string, tag: string): Promise<void> {
  const encoding = 'utf-8'

  core.info(`Updating application tag in file ${filePath} to ${tag}.`)

  try {
    const fileContents = await fs.readFile(filePath, encoding)
    const data = yaml.parseDocument(fileContents)
    const imageTagPath = 'spec.source.helm.valuesObject.image.tag'
    const imageTagNode = data.getIn(imageTagPath.split('.'))

    if (imageTagNode) {
      data.setIn(imageTagPath.split('.'), tag)
      const newYaml = data.toString()
      core.info(`New YAML content for ${filePath}: \n${newYaml}`)
      await fs.writeFile(filePath, newYaml, encoding)
    } else {
      throw new Error(`The path ${imageTagPath} does not exist in ${filePath}`)
    }
  } catch (error) {
    core.warning(`Failed to update application tag in file ${filePath}: ${error}`)
    throw error
  }
}

export const splitApplications = (applications: string): string[] => {
  return applications.split(/[;,]/).map(app => app.trim())
}
