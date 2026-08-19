import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class LoaderService {

    public isLoading = signal(false);

    private reqCount = 0;

    public show() {
        // Deferred to a microtask so this doesn't emit synchronously mid
        // change-detection pass (e.g. when an HTTP request is fired from a
        // component's ngOnInit/constructor during initial render) - emitting
        // there flips isLoading within the same tick a parent's async pipe
        // already checked it, which throws NG0100 in dev mode.
        queueMicrotask(() => this.isLoading.set(true));
    }

    public hide() {
        queueMicrotask(() => this.isLoading.set(false));
    }

    public reqCountInc(): void {
        this.reqCount++;
        if (this.reqCount === 1) {
            this.show();
        }
    }

    public reqCountDec(): void {
        if (this.reqCount > 0) {
            this.reqCount--;
        }
        if (!this.reqCount) {
            this.hide();
        }
    }
}
