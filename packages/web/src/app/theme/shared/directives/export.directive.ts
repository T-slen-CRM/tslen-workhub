import { Directive, HostListener, Input } from '@angular/core';
import * as FileSaver from 'file-saver';
import * as XLSX from 'xlsx';

@Directive({
    selector: '[appExport]',
    standalone: false
})
export class ExportDirective {

    @Input('appExport') grid: any[];
    @Input() fileName: string;
    @Input() format: any;

    fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';

    constructor() { }

    @HostListener('click', ['$event']) onClick($event) {
        this.exportExcel(this.grid, this.fileName, this.format);
    }

    public exportExcel(grid: any[], fileName: string, format: any): void {
        if (grid.length) {
            grid.forEach(row => Object.keys(row).map(key => row[key] = row[key] ? row[key] : 0));
            const data = grid;
            const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
            const wb: XLSX.WorkBook = { Sheets: { 'data': ws }, SheetNames: ['data'] };
            const excelBuffer: any = XLSX.write(wb, { bookType: format, type: 'array' });
            this.saveFile(excelBuffer, fileName);
        }
    }

    private saveFile(buffer: any, fileName: string): void {
        const fileExtension: string = `.${this.format}`;
        const data: Blob = new Blob([buffer], {type: this.fileType});
        FileSaver.saveAs(data, fileName + fileExtension);
    }

}
