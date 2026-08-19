import { fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { LoaderService } from './loader.service';

describe('LoaderService', () => {
  let service: LoaderService;

  beforeEach(() => {
    service = new LoaderService();
  });

  it('sets isLoading to true once the first request starts', fakeAsync(() => {
    service.reqCountInc();
    flushMicrotasks();

    expect(service.isLoading()).toBe(true);
  }));

  it('keeps isLoading true while a second request is still in flight', fakeAsync(() => {
    service.reqCountInc();
    service.reqCountInc();
    flushMicrotasks();

    service.reqCountDec();
    flushMicrotasks();

    expect(service.isLoading()).toBe(true);
  }));

  it('sets isLoading to false once all in-flight requests complete', fakeAsync(() => {
    service.reqCountInc();
    service.reqCountInc();
    flushMicrotasks();

    service.reqCountDec();
    service.reqCountDec();
    flushMicrotasks();

    expect(service.isLoading()).toBe(false);
  }));

  it('does not go below zero when reqCountDec is called with no in-flight requests', fakeAsync(() => {
    service.reqCountDec();
    flushMicrotasks();

    expect(service.isLoading()).toBe(false);
  }));
});
