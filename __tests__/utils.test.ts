import * as core from '@actions/core'
import { run } from '../src/main'
import * as utils from '../src/utils'
import * as commitAndPush from '../src/utils/commit-and-push-changes'

jest.mock('@actions/core')
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
      'in test-cluster: Update app1, app2 to v1.0.0',
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
