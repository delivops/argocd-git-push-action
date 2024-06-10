import * as github from '@actions/github'
import { readFile } from 'fs/promises'
import { config } from './config'
import { G } from './interfaces'

export async function getLatestCommitSha(g: G, owner: string, repo: string, ref: string) {
  const {
    data: {
      object: { sha }
    }
  } = await g.getRef({ owner, repo, ref })
  return sha
}

export async function getBaseTree(g: G, owner: string, repo: string, commitSha: string) {
  const {
    data: {
      tree: { sha }
    }
  } = await g.getCommit({ owner, repo, commit_sha: commitSha })
  return sha
}

export async function createFilesTree(g: G, owner: string, repo: string, filesPath: string[], baseTree: string) {
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
  g: G,
  owner: string,
  repo: string,
  message: string,
  tree: string,
  commitSha: string
) {
  const {
    data: { sha }
  } = await g.createCommit({
    owner,
    repo,
    message,
    tree,
    parents: [commitSha]
  })

  return sha
}

export async function rebaseAndPush(
  g: G,
  owner: string,
  repo: string,
  ref: string,
  treeSha: string,
  latestSha: string,
  message: string
) {
  const {
    data: { sha: rebasedCommitSha }
  } = await g.createCommit({
    owner,
    repo,
    message,
    tree: treeSha,
    parents: [latestSha]
  })

  await g.updateRef({
    owner,
    repo,
    ref,
    sha: rebasedCommitSha,
    force: true
  })
}

export function calculateBackoffTime(attempt: number) {
  return config.baseBackoffTime * attempt + Math.floor(Math.random() * config.randomBackoffTime)
}
