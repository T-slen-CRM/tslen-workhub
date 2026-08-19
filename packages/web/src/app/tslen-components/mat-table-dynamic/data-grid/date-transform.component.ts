import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    ViewChild
} from '@angular/core';
import {MatIconModule} from "@angular/material/icon";
import {MatTooltipModule} from "@angular/material/tooltip";
import {DatePipe} from "@angular/common";

@Component({
    selector: 'app-date-transform',
    template: `
        <span>
            {{inputParams | date:'medium'}}
        </span>
        <div #input [style]="{display: isVisibleInputParams}">
            <ng-content></ng-content>
        </div>
    `,
    imports: [
        MatIconModule,
        MatTooltipModule,
        DatePipe
    ],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DateTransformComponent implements AfterViewInit{
    @ViewChild('input') public input: ElementRef;
    public inputParams: string;
    public isVisibleInputParams: string;
    // public date: string;

    constructor(private ref: ChangeDetectorRef) {
        this.isVisibleInputParams = 'block';
    }
    ngAfterViewInit(): void {
        setTimeout(()=>{
            const row = JSON.parse(this.input.nativeElement.innerText);
            this.inputParams = row.created;
            this.isVisibleInputParams = 'none';
            this.ref.detectChanges();
            this.ref.detach();
        }, 0);
    }
}
