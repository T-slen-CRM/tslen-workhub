import {OnDestroy} from "@angular/core";
import {Subscription} from "rxjs";

export class UnsubscribeOnDestroyAdapter implements OnDestroy {
    protected subscription: Subscription = new Subscription();
    ngOnDestroy() {
        this.subscription.unsubscribe();
    }
}
