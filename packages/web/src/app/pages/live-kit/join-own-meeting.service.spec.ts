import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { JoinOwnMeetingService } from './join-own-meeting.service';
import { AuthenticationService } from '../../services/auth.service';
import { JoinOwnMeetingDialogComponent } from './join-own-meeting-dialog.component';

describe('JoinOwnMeetingService', () => {
  let service: JoinOwnMeetingService;
  let dialogSpy: jasmine.SpyObj<MatDialog>;

  beforeEach(() => {
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    TestBed.configureTestingModule({
      providers: [
        JoinOwnMeetingService,
        { provide: MatDialog, useValue: dialogSpy },
        { provide: AuthenticationService, useValue: { authDataSignal: () => ({ firstName: 'Ada', lastName: 'Lovelace' }) } },
      ],
    });

    service = TestBed.inject(JoinOwnMeetingService);
  });

  it('opens the lobby dialog closeable by the user - not disableClose, and not width-constrained below the lobby\'s own content width', () => {
    service.join('meeting-abc');

    const [component, config] = dialogSpy.open.calls.mostRecent().args;
    expect(component).toBe(JoinOwnMeetingDialogComponent);
    expect(config.disableClose).not.toBe(true);
    // The pre-join lobby lays its video preview (480px) out in a row next
    // to a settings sidebar (see pre-join-lobby.component.css's
    // .pre-join-lobby/.pre-join-preview) - a hard 480px dialog width
    // crushes that layout. Let it size to content instead.
    expect(config.width).toBeUndefined();
    expect(config.data).toEqual({ roomName: 'meeting-abc', displayName: 'Ada-Lovelace' });
  });
});
