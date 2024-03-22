import * as core from '@actions/core'

import { getInputs, commitAndPushChanges, updateYamlFiles } from './utils'

export async function run(): Promise<void> {
  try {
    const {
      clusterName,
      projectName,
      applications,
      tag,
      branchName,
      githubToken
    } = getInputs()

    const filesPath = await updateYamlFiles(
      clusterName,
      projectName,
      applications,
      tag
    )
    const message = `in ${clusterName}: Update ${applications.split(';').join(', ')} to ${tag}`
    await commitAndPushChanges(filesPath, branchName, message, githubToken)
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`)
  }
}
