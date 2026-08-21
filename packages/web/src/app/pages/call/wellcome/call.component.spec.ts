import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CallComponent } from './call.component';
import { AuthenticationService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';

describe('CallComponent', () => {
  let component: CallComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CallComponent, TranslateModule.forRoot()],
      providers: [
        { provide: AuthenticationService, useValue: { authDataSignal: () => ({ id: 1, firstName: 'A', lastName: 'B' }) } },
        { provide: DataService, useValue: {} },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      ],
    });

    const fixture = TestBed.createComponent(CallComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('callerId', 5);
    // calleeId is left at its default (null) on purpose.
  });

  it('does not join a room when calleeId is missing, even though callerId is set', () => {
    const joinRoomSpy = spyOn(component, 'joinRoom');

    component.ngOnInit();

    expect(joinRoomSpy).not.toHaveBeenCalled();
  });
});
