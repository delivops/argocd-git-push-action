import { calculateBackoffTime } from '../src/commit-and-push-utils'
import { config } from '../src/config'

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('calculates backoff time correctly', () => {
    jest.spyOn(global.Math, 'random').mockReturnValue(0.5)

    const expectedRandomPart = Math.floor(0.5 * config.randomBackoffTime)

    expect(calculateBackoffTime(1)).toEqual(config.baseBackoffTime * 1 + expectedRandomPart)
    expect(calculateBackoffTime(2)).toEqual(config.baseBackoffTime * 2 + expectedRandomPart)
    expect(calculateBackoffTime(3)).toEqual(config.baseBackoffTime * 3 + expectedRandomPart)

    jest.spyOn(global.Math, 'random').mockRestore()
  })
})
