import { Component } from '@angular/core';
// import { RightRoundService } from '../core/services/right-round.service';

@Component({
    selector: 'app-curr-renderer-cell',
    template: `<span>{{this.firstValue}} / {{this.secondValue}}</span>`
})
export class MultiValueRendererComponent {

    constructor() {}

    params: any;
    firstValue = 0;
    secondValue = 0;
    multiple: boolean;

    agInit(params: any): void {
        this.params = params;
        if (this.params.value === 'undefined' || this.params.value === undefined){
        }
        if (this.params.value && this.params.value.length > 0) {
            this.firstValue = this.params.value[0];
            this.secondValue = this.params.value[1];
        }
    }

}
