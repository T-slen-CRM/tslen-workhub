import {Component, inject, Input, input, InputSignal, OnInit} from '@angular/core';
import {UserGeneralData} from "../../../interfaces/userConfig";
import {DataService} from "../../../services/data.service";
import {Observable, tap} from "rxjs";
import {AsyncPipe, NgOptimizedImage} from "@angular/common";
import {MatCardModule} from "@angular/material/card";
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'app-user-card-info',
    imports: [
        AsyncPipe,
        MatCardModule,
        NgOptimizedImage,
        TranslateModule
    ],
    templateUrl: './user-card-info.component.html',
    styleUrl: './user-card-info.component.scss'
})
export class UserCardInfoComponent implements OnInit{
  id = input.required({transform: (v) => v ? +v : 0});
  user$: Observable<UserGeneralData>;

  private dataService = inject(DataService);

    ngOnInit() {
      this.user$ = this.dataService.getObservableData(`/users/${this.id()}`).pipe(
          tap((user) => {
        })
      );
    }

}
