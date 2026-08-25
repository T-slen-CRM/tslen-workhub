import {
  Component,
  Inject,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from 'src/app/language/language.service';

@Component({
  selector: 'app-delete-confirm-modal',
  templateUrl: './delete-confirm-modal.component.html',
  styleUrls: ['./delete-confirm-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatDialogModule, MatButtonModule, TranslateModule],
})
export class DeleteConfirmModalComponent implements OnInit {
  public title: string;
  public text: string;
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { text: string; title?: string },
    public translateService: LanguageService,
  ) {
    this.title = this.data.title || 'Delete';
    this.text = this.data.text;
  }

  ngOnInit(): void {
    this.translateService
      .get(['task.phase.delete.text_delete', 'task.phase.delete.title_delete'])
      .subscribe((transition) => {
        this.title = transition['task.phase.delete.title_delete'];
        this.text = transition['task.phase.delete.text_delete'];
      });
  }
}
