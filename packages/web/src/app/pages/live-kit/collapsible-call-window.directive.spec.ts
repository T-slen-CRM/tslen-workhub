import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CollapsibleCallWindowDirective } from './collapsible-call-window.directive';

@Component({
  standalone: true,
  imports: [CollapsibleCallWindowDirective],
  template: `<div appCollapsibleCallWindow #win="appCollapsibleCallWindow">
    <button (click)="win.toggle()">toggle</button>
  </div>`,
})
class HostComponent {}

describe('CollapsibleCallWindowDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('starts collapsed', () => {
    const div: HTMLDivElement = fixture.nativeElement.querySelector('div');
    expect(div.classList.contains('collapsible-call-window--collapsed')).toBe(true);
    expect(div.classList.contains('collapsible-call-window--expanded')).toBe(false);
  });

  it('toggle() switches to expanded, and back to collapsed', () => {
    const div: HTMLDivElement = fixture.nativeElement.querySelector('div');
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    button.click();
    fixture.detectChanges();

    expect(div.classList.contains('collapsible-call-window--expanded')).toBe(true);
    expect(div.classList.contains('collapsible-call-window--collapsed')).toBe(false);

    button.click();
    fixture.detectChanges();

    expect(div.classList.contains('collapsible-call-window--collapsed')).toBe(true);
    expect(div.classList.contains('collapsible-call-window--expanded')).toBe(false);
  });

  it('always carries the base collapsible-call-window class', () => {
    const div: HTMLDivElement = fixture.nativeElement.querySelector('div');
    expect(div.classList.contains('collapsible-call-window')).toBe(true);
  });
});
