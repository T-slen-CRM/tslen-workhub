import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DarkModeButtonComponent } from './dark-mode-button/dark-mode-button.component';

@NgModule({
    declarations: [
        DarkModeButtonComponent
    ],
    exports: [
        DarkModeButtonComponent
    ],
    imports: [
        CommonModule,
        TranslateModule,
    ]
})
export class DarkModeButtonModule { }
