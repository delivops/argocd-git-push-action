import * as core from '@actions/core'
import { backOff, BackoffOptions } from 'exponential-backoff'
import { config } from '../config'

const createBackoffOptions = (maxAttempts: number): BackoffOptions => {
  return {
    numOfAttempts: maxAttempts,
    startingDelay: 1000 * config.BASE_BACKOFF_TIME_IN_SEC,
    delayFirstAttempt: false,
    timeMultiple: 2,
    jitter: 'full',
    retry: async (error, attemptNumber) => {
      core.warning(`Attempt ${attemptNumber} failed with error: ${error}`)
      core.info(`Retrying... (${maxAttempts - attemptNumber} attempt(s) remaining)`)
      return true
    }
  }
}

export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxAttempts: number,
  errorMessage: string
): Promise<T> => {
  try {
    return await backOff(operation, createBackoffOptions(maxAttempts))
  } catch (error) {
    core.setFailed(`${errorMessage} after ${maxAttempts} attempts: ${error}`)
    throw error
  }
}
