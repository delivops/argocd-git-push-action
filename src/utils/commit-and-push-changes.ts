import * as core from '@actions/core'
import { RestGitClient } from '../interface/interfaces'
import * as GitUtils from './git.utils'
import { getGithubContext } from './get-github-context'
import { retryOperation } from './retry-operation'

export async function commitAndPushWithRetries(
  filesPath: string[],
  branchName: string,
  message: string,
  githubToken: string,
  retries: string
): Promise<void> {
  const { g, owner, repo } = getGithubContext(githubToken)
  const ref = `heads/${branchName}`
  const maxAttempts = parseInt(retries, 10) + 1

  await retryOperation(
    async () => await commitAndPushChanges(g, owner, repo, ref, filesPath, message),
    { maxAttempts },
    'Failed to commit and push changes'
  )
}

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
  const newCommitSha = await GitUtils.createCommit(g, owner, repo, message, treeSha, commitSha)

  await updateRefWithRetry(g, owner, repo, ref, newCommitSha, commitSha)

  core.info('Successfully committed and pushed changes.')
}

async function updateRefWithRetry(
  g: RestGitClient,
  owner: string,
  repo: string,
  ref: string,
  newCommitSha: string,
  originalCommitSha: string
): Promise<void> {
  const latestSha = await GitUtils.getLatestCommitSha(g, owner, repo, ref)

  if (latestSha !== originalCommitSha) {
    core.warning('The branch has been updated since we last fetched the latest commit sha.')
    const updatedCommitSha = await GitUtils.createCommit(g, owner, repo, 'Rebased commit', newCommitSha, latestSha)
    await g.updateRef({ owner, repo, ref, sha: updatedCommitSha, force: true })
  } else {
    await g.updateRef({ owner, repo, ref, sha: newCommitSha })
  }
}
