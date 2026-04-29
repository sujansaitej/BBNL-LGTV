import { renderHook, act } from '@testing-library/react';
import { useTapAction, __resetTapLockForTests } from './useTapAction';

beforeEach(() => {
  jest.useFakeTimers();
  __resetTapLockForTests();
});

afterEach(() => {
  jest.useRealTimers();
});

const makeEvent = () => {
  const target = document.createElement('div');
  return { currentTarget: target, target };
};

test('first tap fires the wrapped fn', () => {
  const fn = jest.fn();
  const { result } = renderHook(() => useTapAction(fn));
  const ev = makeEvent();
  act(() => result.current(ev));
  expect(fn).toHaveBeenCalledTimes(1);
});

test('second tap within lock window is dropped', () => {
  const fn = jest.fn();
  const { result } = renderHook(() => useTapAction(fn));
  act(() => result.current(makeEvent()));
  act(() => { jest.advanceTimersByTime(100); });
  act(() => result.current(makeEvent()));
  expect(fn).toHaveBeenCalledTimes(1);
});

test('tap after the 600ms lock window fires again', () => {
  const fn = jest.fn();
  const { result } = renderHook(() => useTapAction(fn));
  act(() => result.current(makeEvent()));
  act(() => { jest.advanceTimersByTime(601); });
  act(() => result.current(makeEvent()));
  expect(fn).toHaveBeenCalledTimes(2);
});

test('press flash is applied for ~120ms then removed', () => {
  const fn = jest.fn();
  const { result } = renderHook(() => useTapAction(fn));
  const ev = makeEvent();
  act(() => result.current(ev));
  expect(ev.currentTarget.getAttribute('data-pressed')).toBe('true');
  act(() => { jest.advanceTimersByTime(125); });
  expect(ev.currentTarget.getAttribute('data-pressed')).toBeNull();
});

test('manual lock release allows next tap immediately', () => {
  const fn = jest.fn();
  const { result } = renderHook(() => useTapAction(fn));
  act(() => result.current(makeEvent()));
  act(() => __resetTapLockForTests());
  act(() => result.current(makeEvent()));
  expect(fn).toHaveBeenCalledTimes(2);
});
