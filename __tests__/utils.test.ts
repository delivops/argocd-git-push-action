import * as core from '@actions/core'
import { run } from '../src/main'
import * as utils from '../src/utils'
import * as commitAndPush from '../src/utils/commit-and-push-changes'

// Mock the GitHub Actions core library
let getInputMock: jest.SpiedFunction<typeof core.getInput>
let setFailedMock: jest.SpiedFunction<typeof core.setFailed>

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
  })

  it('updates YAML files and commits changes', async () => {
    // Set the action's inputs as return values from core.getInput()
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'cluster_name':
          return 'your-cluster-name'
        case 'applications':
          return 'your-application-1,your-application-2'
        case 'project_name':
          return 'your-project-name'
        case 'tag':
          return 'v1.2.3'
        case 'github-token':
          return 'your-github-token'
        case 'retries':
          return '3'
        default:
          return ''
      }
    })

    // Mock the updateYamlFiles and commitAndPush functions
    const updateYamlFilesMock = jest.spyOn(utils, 'updateYamlFiles').mockResolvedValue(['file1.yaml', 'file2.yaml'])
    const commitAndPushMock = jest.spyOn(commitAndPush, 'commitAndPushChanges').mockResolvedValue()

    await run()

    expect(updateYamlFilesMock).toHaveBeenCalledWith(
      'your-cluster-name',
      'your-project-name',
      'your-application-1,your-application-2',
      'v1.2.3'
    )
    expect(commitAndPushMock).toHaveBeenCalledWith(
      ['file1.yaml', 'file2.yaml'],
      process.env.GITHUB_HEAD_REF || 'main',
      'in your-cluster-name: Update your-application-1, your-application-2 to v1.2.3',
      'your-github-token',
      '3'
    )
    expect(setFailedMock).not.toHaveBeenCalled()
  })

  it('sets a failed status for invalid inputs', async () => {
    // Set the action's inputs as return values from core.getInput()
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'cluster_name':
          return 'cluster'
        case 'applications':
          return 'your-application-1,your-application-2'
        case 'project_name':
          return 'your-project-name'
        case 'tag':
          return 'v1.2.3'
        case 'github-token':
          return 'your-github-token'
        case 'retries':
          return 'invalid-retries' // Non-numeric retries value should fail
        default:
          return ''
      }
    })

    await run()

    expect(setFailedMock).toHaveBeenCalledWith(expect.stringContaining('Action failed with error'))
  })

  it('updates YAML files and commits changes with semicolon-separated applications', async () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'cluster_name':
          return 'your-cluster-name'
        case 'applications':
          return 'your-application-1;your-application-2'
        case 'project_name':
          return 'your-project-name'
        case 'tag':
          return 'v1.2.3'
        case 'github-token':
          return 'your-github-token'
        case 'retries':
          return '3'
        default:
          return ''
      }
    })

    const updateYamlFilesMock = jest.spyOn(utils, 'updateYamlFiles').mockResolvedValue(['file1.yaml', 'file2.yaml'])
    const commitAndPushChangesMock = jest.spyOn(commitAndPush, 'commitAndPushChanges').mockResolvedValue()

    await run()

    expect(updateYamlFilesMock).toHaveBeenCalledWith(
      'your-cluster-name',
      'your-project-name',
      'your-application-1;your-application-2',
      'v1.2.3'
    )
    expect(commitAndPushChangesMock).toHaveBeenCalledWith(
      ['file1.yaml', 'file2.yaml'],
      process.env.GITHUB_HEAD_REF || 'main',
      'in your-cluster-name: Update your-application-1, your-application-2 to v1.2.3',
      'your-github-token',
      '3'
    )
    expect(setFailedMock).not.toHaveBeenCalled()
  })

  it('handles non-existent YAML files gracefully', async () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'cluster_name':
          return 'your-cluster-name'
        case 'applications':
          return 'your-application-1,your-application-2'
        case 'project_name':
          return 'your-project-name'
        case 'tag':
          return 'v1.2.3'
        case 'github-token':
          return 'your-github-token'
        case 'retries':
          return '3'
        default:
          return ''
      }
    })

    jest.spyOn(utils, 'updateYamlFiles').mockResolvedValue([])
    const commitAndPushChangesMock = jest.spyOn(commitAndPush, 'commitAndPushChanges').mockResolvedValue()

    await run()

    expect(commitAndPushChangesMock).not.toHaveBeenCalled()
    expect(setFailedMock).toHaveBeenCalledWith(expect.stringContaining('Action failed with error'))
  })
})
