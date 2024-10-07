import * as core from '@actions/core'
import { getInputs, splitApplications, updateYamlFiles } from './utils'
import { commitAndPushWithRetry } from './utils/commit-and-push-with-retry'

export async function run(): Promise<void> {
  core.info('Sleeping for 60 seconds before starting')

  // Add this function to sleep for a specified number of milliseconds
  const sleep = async (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))
  // Sleep for 60 seconds before retrying
  await sleep(60000)

  try {
    const { clusterName, projectName, applications, tag, branchName, githubToken, retries } = getInputs()

    core.info(`Updating YAML files for applications: ${applications}`)
    const filesPath = await updateYamlFiles(clusterName, projectName, applications, tag)

    if (filesPath.length === 0) {
      throw new Error('No valid files found to update')
    }

    const message = `in ${clusterName}: Update ${splitApplications(applications).join(', ')} to ${tag} [skip ci]`
    core.info(`Committing and pushing changes with message: "${message}"`)

    await commitAndPushWithRetry(filesPath, branchName, message, githubToken, retries)
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`)
  }
}
