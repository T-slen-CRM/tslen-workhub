import { Directive, signal } from '@angular/core';

/**
 * Shared "floating overlay that starts collapsed and can be expanded to a
 * larger in-page view" behavior for a call window - applied directly to a
 * component's own root overlay element (e.g. CallComponent's `.call-window`,
 * MeetingRoomComponent's `.meeting-room`) alongside that element's own
 * classes. Owns only the collapsed/expanded state; each host component pairs
 * it with `cdkDrag`/`cdkDragHandle` itself (a separate concern, applied the
 * same way both components already used before this was extracted) and with
 * `collapsible-call-window.css`'s shared sizing rules, which key off this
 * directive's host classes.
 */
@Directive({
  selector: '[appCollapsibleCallWindow]',
  standalone: true,
  exportAs: 'appCollapsibleCallWindow',
  host: {
    class: 'collapsible-call-window',
    '[class.collapsible-call-window--collapsed]': 'collapsed()',
    '[class.collapsible-call-window--expanded]': '!collapsed()',
  },
})
export class CollapsibleCallWindowDirective {
  collapsed = signal(true);

  toggle (): void {
    this.collapsed.set(!this.collapsed());
  }
}
