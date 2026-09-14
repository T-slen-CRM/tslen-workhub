import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { JoinOwnMeetingDialogComponent } from './join-own-meeting-dialog.component';
import { DataService } from '../../services/data.service';
import { ActiveMeetingCallService } from './active-meeting-call.service';

// Stand-in for the real, heavy PreJoinLobbyComponent (camera/mic access,
// background-image fetching) - same "stub the child by selector" pattern
// live-kit.component.spec.ts uses, since this test only exercises the
// dialog wrapper's own close button.
@Component({ selector: 'app-pre-join-lobby', template: '' })
class StubPreJoinLobbyComponent {}

describe('JoinOwnMeetingDialogComponent', () => {
  let fixture: ComponentFixture<JoinOwnMeetingDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<JoinOwnMeetingDialogComponent>>;

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      imports: [JoinOwnMeetingDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { roomName: 'meeting-abc', displayName: 'Ada' } },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: DataService, useValue: jasmine.createSpyObj('DataService', ['sendToken']) },
        { provide: ActiveMeetingCallService, useValue: jasmine.createSpyObj('ActiveMeetingCallService', ['start']) },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['warning']) },
      ],
    });
    TestBed.overrideComponent(JoinOwnMeetingDialogComponent, {
      set: { imports: [StubPreJoinLobbyComponent, MatIconModule, MatButtonModule] },
    });
    await TestBed.compileComponents();

    fixture = TestBed.createComponent(JoinOwnMeetingDialogComponent);
    fixture.detectChanges();
  });

  it('closes the dialog when the close button is clicked - previously the only way out was completing or failing the join', () => {
    const closeButton: HTMLButtonElement = fixture.nativeElement.querySelector('.join-own-meeting-close');
    expect(closeButton).not.toBeNull();

    closeButton.click();

    expect(dialogRefSpy.close).toHaveBeenCalled();
  });
});
