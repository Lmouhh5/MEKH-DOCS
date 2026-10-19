import '@testing-library/jest-dom'
import 'jest-location-mock'

if (typeof window !== 'undefined' && !window.PointerEvent) {
  // @ts-expect-error polyfill PointerEvent for jsdom
  window.PointerEvent = class PointerEvent extends MouseEvent {}
}
