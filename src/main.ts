import * as core from '@actions/core'
import { getInputs, splitApplications, updateYamlFiles } from './utils'
import { commitAndPushWithRetry } from './utils/commit-and-push-with-retry'

export async function run(): Promise<void> {
  try {
    const { clusterName, projectName, applications, tag, branchName, githubToken, retries } = getInputs()

    core.info(`Updating YAML files for applications: ${applications}`)
    const filesPath = await updateYamlFiles(clusterName, projectName, applications, tag)

    if (filesPath.length === 0) {
      throw new Error('No valid files found to update')
    }

    const message = `in ${clusterName}: Update ${splitApplications(applications).join(', ')} to ${tag}`
    core.info(`Committing and pushing changes with message: "${message}"`)

    await commitAndPushWithRetry(filesPath, branchName, message, githubToken, retries)
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`)
  }
}
