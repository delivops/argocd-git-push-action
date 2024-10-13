import * as core from '@actions/core'
import { run } from '../src/main'
import * as utils from '../src/utils'
import * as commitAndPush from '../src/utils/commit-and-push-changes'
import * as fs from 'fs/promises'

jest.mock('@actions/core')
jest.mock('fs/promises')
jest.mock('../src/utils', () => ({
  ...jest.requireActual('../src/utils'),
  updateYamlFiles: jest.fn()
}))
jest.mock('../src/utils/commit-and-push-changes')

describe('run function', () => {
  const mockInputs = {
    cluster_name: 'test-cluster',
    applications: 'app1,app2',
    project_name: 'test-project',
    tag: 'v1.0.0',
    'github-token': 'test-token',
    branchName: 'test-branch',
    retries: '3'
  }

  beforeEach(() => {
    jest.resetAllMocks()
    ;(core.getInput as jest.Mock).mockImplementation((name: string) => mockInputs[name as keyof typeof mockInputs])
  })

  it('should update YAML files and commit changes', async () => {
    const mockFilesPath = ['file1.yaml', 'file2.yaml']
    ;(utils.updateYamlFiles as jest.Mock).mockResolvedValueOnce(mockFilesPath)
    ;(commitAndPush.commitAndPushWithRetries as jest.Mock).mockResolvedValueOnce(undefined)

    await run()

    expect(utils.updateYamlFiles).toHaveBeenCalledWith('test-cluster', 'test-project', 'app1,app2', 'v1.0.0')
    expect(commitAndPush.commitAndPushWithRetries).toHaveBeenCalledWith(
      mockFilesPath,
      'main',
      'in test-cluster: Update app1, app2 to v1.0.0 [skip ci]',
      'test-token',
      '3'
    )
    expect(core.setFailed).not.toHaveBeenCalled()
  })

  it('should handle errors and set failed status', async () => {
    const mockError = new Error('Test error')
    ;(utils.updateYamlFiles as jest.Mock).mockRejectedValueOnce(mockError)

    await run()

    expect(core.setFailed).toHaveBeenCalledWith(`Action failed with error: ${mockError}`)
  })

  it('should handle empty file paths', async () => {
    ;(utils.updateYamlFiles as jest.Mock).mockResolvedValueOnce([])

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('Action failed with error: Error: No valid files found to update')
    expect(commitAndPush.commitAndPushWithRetries).not.toHaveBeenCalled()
  })
})

describe('getInputs', () => {
  it('should return the input values', () => {
    process.env.GITHUB_HEAD_REF = 'test-branch'
    const mockInputs = {
      cluster_name: 'test-cluster',
      applications: 'app1,app2',
      project_name: 'test-project',
      'github-token': 'test-token',
      tag: 'v1.0.0',
      retries: '3'
    }
    ;(core.getInput as jest.Mock).mockImplementation((name: string) => mockInputs[name as keyof typeof mockInputs])

    const result = utils.getInputs()

    expect(result).toEqual({
      clusterName: 'test-cluster',
      applications: 'app1,app2',
      projectName: 'test-project',
      githubToken: 'test-token',
      tag: 'v1.0.0',
      branchName: 'test-branch',
      retries: '3'
    })
  })

  it('should throw an error when required inputs are missing', () => {
    ;(core.getInput as jest.Mock).mockImplementation((_name: string) => '')

    expect(() => utils.getInputs()).toThrow('Missing required inputs.')
  })
})

describe('validateInputs', () => {
  it('should not throw an error when inputs are valid', () => {
    const inputs = {
      clusterName: 'test-cluster',
      applications: 'app1,app2',
      projectName: 'test-project',
      githubToken: 'test-token',
      tag: 'v1.0.0',
      branchName: 'test-branch',
      retries: '3'
    }

    expect(() => utils.validateInputs(inputs)).not.toThrow()
  })

  it('should throw an error when retries is invalid', () => {
    const inputs = {
      clusterName: 'test-cluster',
      applications: 'app1,app2',
      projectName: 'test-project',
      githubToken: 'test-token',
      tag: 'v1.0.0',
      branchName: 'test-branch',
      retries: 'invalid'
    }

    expect(() => utils.validateInputs(inputs)).toThrow('Invalid retries value.')
  })
})

describe('findValidFilePath', () => {
  it('should return the file path when found', async () => {
    const clusterName = 'test-cluster'
    const projectName = 'test-project'
    const application = 'app1'
    const knownFolderName = null
    ;(fs.access as jest.Mock).mockResolvedValue(undefined)

    const result = await utils.findValidFilePath(clusterName, projectName, application, knownFolderName)

    expect(result).toBe('env/test-cluster/test-project/app1.yaml')
  })

  it('should return null when no valid file path is found', async () => {
    const clusterName = 'test-cluster'
    const projectName = 'test-project'
    const application = 'app1'
    const knownFolderName = null
    ;(fs.access as jest.Mock).mockRejectedValue(new Error('File not found'))

    const result = await utils.findValidFilePath(clusterName, projectName, application, knownFolderName)

    expect(result).toBeNull()
  })
})

describe('updateApplicationTagInFile', () => {
  it('should update the application tag in the file', async () => {
    const filePath = 'test.yaml'
    const tag = 'v1.0.0'
    const fileContent = `
      spec:
        source:
          helm: 
            valuesObject:
              image:
                tag: v0.9.0
    `
    ;(fs.readFile as jest.Mock).mockResolvedValue(fileContent)
    ;(fs.writeFile as jest.Mock).mockResolvedValue(undefined)

    await utils.updateApplicationTagInFile(filePath, tag)

    expect(fs.readFile).toHaveBeenCalledWith(filePath, 'utf-8')
    expect(fs.writeFile).toHaveBeenCalledWith(filePath, expect.stringContaining('tag: v1.0.0'), 'utf-8')
  })

  it('should throw an error when the tag path is not found', async () => {
    const filePath = 'test.yaml'
    const tag = 'v1.0.0'
    const fileContent = `
      spec:
        source:
          helm: 
            valuesObject:
              image:
                version: v0.9.0
    `
    ;(fs.readFile as jest.Mock).mockResolvedValue(fileContent)

    await expect(utils.updateApplicationTagInFile(filePath, tag)).rejects.toThrow(
      `The path spec.source.helm.valuesObject.image.tag does not exist or is not a string in file ${filePath}`
    )
  })
})
