/**
 * Unit tests for the action's entrypoint, src/index.ts
 */
import * as main from '../src/main'

// Mock the action's entrypoint
jest.mock('../src/main', () => ({
  run: jest.fn()
}))

describe('index', () => {
  it('calls run when imported', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../src/index')
    expect(main.run).toHaveBeenCalled()
  })
})
