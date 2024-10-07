import * as core from '@actions/core'
import { RestGitClient } from '../interfaces'
import * as GitUtils from './git.utils'

export async function commitAndPushChanges(
  g: RestGitClient,
  owner: string,
  repo: string,
  ref: string,
  filesPath: string[],
  message: string
): Promise<void> {
  const commitSha = await GitUtils.getLatestCommitSha(g, owner, repo, ref)
  const baseTree = await GitUtils.getBaseTree(g, owner, repo, commitSha)
  const treeSha = await GitUtils.createFilesTree(g, owner, repo, filesPath, baseTree)

  const commitShaNew = await GitUtils.createCommit(g, owner, repo, message, treeSha, commitSha)

  core.info('Sleeping for 20 seconds before starting')
  // Add this function to sleep for a specified number of milliseconds
  const sleep = async (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))
  // Sleep for 20 seconds before retrying
  for (let i = 0; i < 20; i++) {
    await sleep(1000)
    core.info(`Sleeping for ${i + 1} seconds`)
  }

  const latestSha = await GitUtils.getLatestCommitSha(g, owner, repo, ref)

  let sha = commitShaNew
  // let force = false
  if (latestSha !== commitSha) {
    console.warn('The branch has been updated since we last fetched the latest commit sha.')
    // Rebasing the changes on top of the latest commit
    sha = await GitUtils.createCommit(g, owner, repo, message, treeSha, latestSha)
    // force = true;
  }

  await g.updateRef({ owner, repo, ref, sha }) // force
  core.info('Successfully committed and pushed changes.')
}
