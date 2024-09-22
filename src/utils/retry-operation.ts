import * as core from '@actions/core'
import { backOff, BackoffOptions } from 'exponential-backoff'
import { config } from '../config'

export interface RetryOptions {
  maxAttempts: number
  startingDelay?: number
  timeMultiple?: number
}

export const createBackoffOptions = (options: RetryOptions): BackoffOptions => {
  return {
    numOfAttempts: options.maxAttempts,
    startingDelay: options.startingDelay || 1000 * config.BASE_BACKOFF_TIME_IN_SEC,
    delayFirstAttempt: false,
    timeMultiple: options.timeMultiple || 2,
    jitter: 'full',
    retry: async (error, attemptNumber) => {
      core.warning(`Attempt ${attemptNumber} failed with error: ${error}`)
      core.info(`Retrying... (${options.maxAttempts - attemptNumber} attempt(s) remaining)`)
      return true
    }
  }
}

export const retryOperation = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions,
  errorMessage: string
): Promise<T> => {
  try {
    return await backOff(operation, createBackoffOptions(options))
  } catch (error) {
    core.setFailed(`${errorMessage} after ${options.maxAttempts} attempts: ${error}`)
    throw error
  }
}
