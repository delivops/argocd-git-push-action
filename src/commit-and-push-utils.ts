export async function getLatestCommitSha(g, owner, repo, ref) {
  const {
    data: {
      object: { sha }
    }
  } = await g.getRef({ owner, repo, ref })
  return sha
}

export async function getBaseTree(g, owner, repo, commitSha) {
  const {
    data: {
      tree: { sha }
    }
  } = await g.getCommit({ owner, repo, commit_sha: commitSha })
  return sha
}

export async function createFilesTree(g, owner, repo, filesPath, baseTree) {
  const filesTree = await Promise.all(
    filesPath.map(async path => {
      const content = fs.readFileSync(path)
      const { data } = await g.createBlob({
        owner,
        repo,
        content: content.toString(),
        encoding: 'utf-8'
      })
      return {
        path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: data.sha
      }
    })
  )

  const {
    data: { sha }
  } = await g.createTree({ owner, repo, base_tree: baseTree, tree: filesTree })
  return sha
}

export async function createCommit(g, owner, repo, message, tree, commitSha) {
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

export async function rebaseAndPush(g, owner, repo, ref, treeSha, latestSha, message) {
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

export function calculateBackoffTime(attempt) {
  return config.baseBackoffTime * attempt + Math.floor(Math.random() * config.maxRandomBackoff)
}
