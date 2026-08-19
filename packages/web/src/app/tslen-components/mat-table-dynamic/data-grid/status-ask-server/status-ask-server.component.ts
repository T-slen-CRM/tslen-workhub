import {AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, ViewChild} from '@angular/core';
import {MatIconModule} from "@angular/material/icon";
import {MatTableService} from "../../../../services/matTableService";
import {CommonModule} from "@angular/common";
@Component({
    selector: 'app-status-ask-server',
    templateUrl: './status-ask-server.component.html',
    styleUrls: [`./status-ask-server.component.scss`],
    imports: [CommonModule, MatIconModule],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatusAskServerComponent implements AfterViewInit{
    @ViewChild('input') public input: ElementRef;
    public inputParams: string;
    public isVisibleInputParams: string;
    public styleSettings: object;
    public oneStyle: object;
    public icon: string;

    constructor(public matTableService: MatTableService, private ref: ChangeDetectorRef) {
        this.styleSettings = this.matTableService.askServerStatusOptions;
        this.isVisibleInputParams = 'block';
    }
    ngAfterViewInit(): void {
        setTimeout(()=>{
            const row = JSON.parse(this.input.nativeElement.innerText);
            this.inputParams = row.status;
            this.oneStyle = {color: this.styleSettings[this.inputParams].color};
            this.icon = this.styleSettings[this.inputParams].icon;
            this.isVisibleInputParams = 'none';
            this.ref.detectChanges();
            this.ref.detach();
        }, 0);
    }
}
