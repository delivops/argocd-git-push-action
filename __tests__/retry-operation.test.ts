import * as core from '@actions/core'
import { backOff } from 'exponential-backoff'
import { retryOperation, createBackoffOptions, RetryOptions } from '../src/utils/retry-operation'

jest.mock('@actions/core')
jest.mock('exponential-backoff')

describe('retry-operation', () => {
  const mockOptions: RetryOptions = {
    maxAttempts: 3,
    startingDelay: 1000,
    timeMultiple: 2
  }

  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('createBackoffOptions', () => {
    it('should create backoff options with default values', () => {
      const options = createBackoffOptions({ maxAttempts: 3 })
      expect(options.numOfAttempts).toBe(3)
      expect(options.startingDelay).toBe(5000)
      expect(options.timeMultiple).toBe(2)
    })

    it('should create backoff options with custom values', () => {
      const options = createBackoffOptions(mockOptions)
      expect(options.numOfAttempts).toBe(3)
      expect(options.startingDelay).toBe(1000)
      expect(options.timeMultiple).toBe(2)
    })

    it('should handle retry function', async () => {
      const options = createBackoffOptions(mockOptions)
      const error = new Error('Test error')
      await options.retry?.(error, 1)
      expect(core.warning).toHaveBeenCalledWith('Attempt 1 failed with error: Error: Test error')
      expect(core.info).toHaveBeenCalledWith('Retrying... (2 attempt(s) remaining)')
    })
  })

  describe('retryOperation', () => {
    it('should retry the operation and return result on success', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success')
      ;(backOff as jest.Mock).mockImplementation(async fn => fn())

      const result = await retryOperation(mockOperation, mockOptions, 'Test error')

      expect(result).toBe('success')
      expect(backOff).toHaveBeenCalledTimes(1)
      expect(core.setFailed).not.toHaveBeenCalled()
    })

    it('should throw an error after max attempts', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Test error'))
      ;(backOff as jest.Mock).mockRejectedValue(new Error('Max attempts reached'))

      await expect(retryOperation(mockOperation, mockOptions, 'Test error')).rejects.toThrow('Max attempts reached')

      expect(backOff).toHaveBeenCalledTimes(1)
      expect(core.setFailed).toHaveBeenCalledWith('Test error after 3 attempts: Error: Max attempts reached')
    })
  })
})
