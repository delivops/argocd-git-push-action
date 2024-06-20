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
  const latestSha = await GitUtils.getLatestCommitSha(g, owner, repo, ref)

  let sha = commitShaNew
  let force = false
  if (latestSha !== commitSha) {
    console.warn('The branch has been updated since we last fetched the latest commit sha.')
    // Rebasing the changes on top of the latest commit
    sha = await GitUtils.createCommit(g, owner, repo, message, treeSha, latestSha)
    force = true
  }

  await g.updateRef({ owner, repo, ref, sha, force })
  core.info('Successfully committed and pushed changes.')
}
