import { afterEach, expect, mock, test } from 'bun:test'
import { exitFullscreen, getFullscreen, onFullscreenChange, requestFullscreen } from './host'

const originalWindow = globalThis.window

afterEach(() => {
  if (originalWindow === undefined)
    Reflect.deleteProperty(globalThis, 'window')
  else
    globalThis.window = originalWindow
})

test('fullscreen helpers forward host state and changes', async () => {
  const enter = mock(async () => {})
  const exit = mock(async () => {})
  const get = mock(async () => true)
  const stop = mock(() => {})
  const subscribe = mock((listener: (enabled: boolean) => void) => {
    listener(false)
    return stop
  })
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { nimiqPay: { requestFullscreen: enter, exitFullscreen: exit, getFullscreen: get, onFullscreenChange: subscribe } },
  })

  const listener = mock(() => {})
  await requestFullscreen()
  await exitFullscreen()
  expect(await getFullscreen()).toBe(true)
  onFullscreenChange(listener)()

  expect(enter).toHaveBeenCalledTimes(1)
  expect(exit).toHaveBeenCalledTimes(1)
  expect(get).toHaveBeenCalledTimes(1)
  expect(listener).toHaveBeenCalledWith(false)
  expect(stop).toHaveBeenCalledTimes(1)
})

test('fullscreen helpers report an unavailable host', async () => {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: undefined })

  await expect(requestFullscreen()).rejects.toThrow('unavailable')
  await expect(exitFullscreen()).rejects.toThrow('unavailable')
  await expect(getFullscreen()).rejects.toThrow('unavailable')
  expect(() => onFullscreenChange(() => {})).toThrow('unavailable')
})
