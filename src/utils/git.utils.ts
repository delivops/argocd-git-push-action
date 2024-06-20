import { readFile } from 'fs/promises'
import { RestGitClient } from '../interfaces'

export async function getLatestCommitSha(g: RestGitClient, owner: string, repo: string, ref: string): Promise<string> {
  const {
    data: {
      object: { sha }
    }
  } = await g.getRef({ owner, repo, ref })
  return sha
}

export async function getBaseTree(g: RestGitClient, owner: string, repo: string, commitSha: string): Promise<string> {
  const {
    data: {
      tree: { sha }
    }
  } = await g.getCommit({ owner, repo, commit_sha: commitSha })
  return sha
}

export async function createFilesTree(
  g: RestGitClient,
  owner: string,
  repo: string,
  filesPath: string[],
  baseTree: string
): Promise<string> {
  const encoding = 'utf-8'

  const filesTree = await Promise.all(
    filesPath.map(async path => {
      const content = await readFile(path, encoding)
      const { data } = await g.createBlob({ owner, repo, content, encoding })
      return { path, mode: '100644' as const, type: 'blob' as const, sha: data.sha }
    })
  )

  const {
    data: { sha }
  } = await g.createTree({ owner, repo, base_tree: baseTree, tree: filesTree })
  return sha
}

export async function createCommit(
  g: RestGitClient,
  owner: string,
  repo: string,
  message: string,
  treeSha: string,
  commitSha: string
): Promise<string> {
  const {
    data: { sha }
  } = await g.createCommit({
    owner,
    repo,
    message,
    tree: treeSha,
    parents: [commitSha]
  })

  return sha
}
