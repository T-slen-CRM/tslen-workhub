// This spec suite was written against Jasmine's API (createSpy, createSpyObj,
// spyOn, .and.*, .calls.*) under Karma. @types/jest already declares most of
// that ambient `jasmine` namespace/global `spyOn` (Jest ships a copy of
// Jasmine's types for back-compat) - the `declare global` block below only
// adds what's missing (resolveTo/rejectWith, SpyObj<T>, the 3-arg
// createSpyObj overload this codebase uses for stubbed properties). The
// runtime implementation below is real, backed by jest.fn()/jest.spyOn()
// underneath, not a fake.
//
// Gotcha this file exists specifically to handle: jasmine's spyOn() blocks
// the real implementation by default (spy just records calls, returns
// undefined) until .and.callThrough() is called - the OPPOSITE of
// jest.spyOn()'s own default, which calls through automatically. Getting
// this backwards would make spyOn(obj, 'method') silently execute real
// side-effecting code (e.g. a real Picture-in-Picture window) in specs that
// only meant to observe the call.
//
// `any` and ambient `namespace` augmentation are both unavoidable here -
// spies interop with arbitrary objects/methods, and `declare global {
// namespace jasmine {...} }` is the only syntax for augmenting a
// third-party ambient namespace.
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-namespace */

type AnySpy = jest.Mock & {
  and: {
    callFake: (fn: (...args: any[]) => any) => AnySpy;
    callThrough: () => AnySpy;
    returnValue: (value: unknown) => AnySpy;
    returnValues: (...values: unknown[]) => AnySpy;
    resolveTo: (value: unknown) => AnySpy;
    rejectWith: (error: unknown) => AnySpy;
    stub: () => AnySpy;
  };
  calls: {
    count: () => number;
    allArgs: () => unknown[][];
    argsFor: (index: number) => unknown[];
    mostRecent: () => { args: unknown[] };
    first: () => { args: unknown[] };
    reset: () => void;
    any: () => boolean;
  };
};

function attachSpyApi (fn: jest.Mock, original?: (...args: any[]) => any): AnySpy {
  const spy = fn as AnySpy;
  spy.and = {
    callFake: (impl) => { spy.mockImplementation(impl); return spy; },
    callThrough: () => {
      if (!original) { throw new Error('and.callThrough() requires spyOn(obj, method), not createSpy()'); }
      spy.mockImplementation(original);
      return spy;
    },
    returnValue: (value) => { spy.mockImplementation(() => value); return spy; },
    returnValues: (...values) => {
      spy.mockReset();
      values.forEach((v) => spy.mockReturnValueOnce(v));
      return spy;
    },
    resolveTo: (value) => { spy.mockImplementation(() => Promise.resolve(value)); return spy; },
    rejectWith: (error) => { spy.mockImplementation(() => Promise.reject(error)); return spy; },
    stub: () => { spy.mockImplementation(() => undefined); return spy; },
  };
  spy.calls = {
    count: () => spy.mock.calls.length,
    allArgs: () => spy.mock.calls,
    argsFor: (index) => spy.mock.calls[index] ?? [],
    mostRecent: () => ({ args: spy.mock.calls[spy.mock.calls.length - 1] ?? [] }),
    first: () => ({ args: spy.mock.calls[0] ?? [] }),
    reset: () => spy.mockClear(),
    any: () => spy.mock.calls.length > 0,
  };
  return spy;
}

function createSpy (): AnySpy {
  return attachSpyApi(jest.fn());
}

function createSpyObj (
  baseNameOrMethods: string | string[],
  methodNames?: string[],
  propertiesOrValues?: string[] | Record<string, unknown>,
): Record<string, unknown> {
  const methods = Array.isArray(baseNameOrMethods) ? baseNameOrMethods : (methodNames ?? []);
  const obj: Record<string, unknown> = {};
  for (const method of methods) {
    obj[method] = createSpy();
  }
  if (propertiesOrValues) {
    if (Array.isArray(propertiesOrValues)) {
      for (const prop of propertiesOrValues) { obj[prop] = undefined; }
    } else {
      Object.assign(obj, propertiesOrValues);
    }
  }
  return obj;
}

function spyOnImpl<T, K extends keyof T> (object: T, methodName: K): AnySpy {
  const original = (object[methodName] as unknown as (...args: any[]) => any).bind(object);
  const jestSpy = jest.spyOn(object as any, methodName as any) as unknown as jest.Mock;
  jestSpy.mockImplementation(() => undefined);
  return attachSpyApi(jestSpy, original);
}

function spyOnPropertyImpl<T, K extends keyof T> (object: T, propertyName: K, accessType: 'get' | 'set' = 'get'): AnySpy {
  const jestSpy = jest.spyOn(object as any, propertyName as any, accessType) as unknown as jest.Mock;
  jestSpy.mockImplementation(() => undefined);
  return attachSpyApi(jestSpy);
}

(globalThis as any).jasmine = {
  createSpy,
  createSpyObj,
  any: (expectedType: unknown) => expect.any(expectedType as any),
  anything: () => expect.anything(),
  objectContaining: (sample: unknown) => expect.objectContaining(sample as any),
};
(globalThis as any).spyOn = spyOnImpl;
(globalThis as any).spyOnProperty = spyOnPropertyImpl;

expect.extend({
  toBeTrue (received: unknown) {
    const pass = received === true;
    return { pass, message: () => `expected ${String(received)} to${pass ? ' not' : ''} be true` };
  },
  toBeFalse (received: unknown) {
    const pass = received === false;
    return { pass, message: () => `expected ${String(received)} to${pass ? ' not' : ''} be false` };
  },
});

declare global {
  namespace jasmine {
    interface SpyAnd {
      resolveTo (value: unknown): Spy;
      rejectWith (error: unknown): Spy;
    }
    type SpyObj<T> = {
      [K in keyof T]: T[K] extends (...args: any[]) => any ? Spy : T[K];
    };
    // The 3-arg (methods + stubbed-properties) overload this codebase uses;
    // returns `any` rather than SpyObj<T> here (T has nothing to infer from
    // at a bare `createSpyObj(...)` call site) - callers that want real
    // typing declare `let x: jasmine.SpyObj<Foo>` and assign into it, which
    // is checked against that explicit annotation regardless.
    function createSpyObj (baseName: string | string[], methodNames?: string[], propertiesOrValues?: string[] | Record<string, unknown>): any;
  }
  function spyOnProperty<T, K extends keyof T> (object: T, propertyName: K, accessType?: 'get' | 'set'): jasmine.Spy;

  namespace jest {
    interface Matchers<R> {
      toBeTrue (): R;
      toBeFalse (): R;
    }
  }
}

export {};
