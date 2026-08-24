import {
  Component,
  EventEmitter,
  Input,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { LanguageService } from 'src/app/language/language.service';

@Component({
  selector: 'app-modal-dialog-header',
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    MatButtonModule,
  ],
  templateUrl: './modal-dialog-header.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./modal-dialog-header.component.scss'],
})
export class ModalDialogHeaderComponent {
  constructor(public translateService: LanguageService) {}
  @Input() title: string;
  get titleDate(): Date | null {
    const date = new Date(this.title);
    return isNaN(date.getTime()) ? null : date;
  }
  @Input() tooltipText: string;
  @Output() closeDialog: EventEmitter<boolean> = new EventEmitter<boolean>();
}
