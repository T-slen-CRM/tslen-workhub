import {Component, Input, OnInit} from '@angular/core';
import {NavigationItem} from '../../navigation';
import {NextConfig} from '../../../../../../app-config';
import {Location} from '@angular/common';
import {PendingService} from "../../../../../../services/pending.service";
import { LanguageService } from 'src/app/language/language.service';

@Component({
    selector: 'app-nav-item',
    templateUrl: './nav-item.component.html',
    styleUrls: ['./nav-item.component.scss'],
    standalone: false
})
export class NavItemComponent implements OnInit {
  @Input() item: NavigationItem;
  public nextConfig: any;
  public themeLayout: string;
  public badge: number;

  constructor(private location: Location,
              private pendingService: PendingService,
              public  translate: LanguageService
            ) {
    this.nextConfig = NextConfig.config;
    this.themeLayout = this.nextConfig['layout'];
  }

  ngOnInit() {
    if (this.item.id === 'pending'){
      this.pendingService.getPendingData().subscribe(response =>{
        this.badge = response.length;
        this.item.badge.title = this.badge?.toString() || '';
        this.pendingService.setCreativePendingCount(this.badge, true);
      })
    this.pendingService.pendingCount.subscribe(count => {
      this.badge = count;
    if (this.badge < 1){
      this.item.badge.title = '';
    } else {
      this.item.badge.title = this.badge.toString();
    }

      })
    }
  }

  closeOtherMenu(event) {
    if (this.nextConfig['layout'] === 'vertical') {
      const ele = event.target;
      if (ele !== null && ele !== undefined) {
        const parent = ele.parentElement;
        const up_parent = parent.parentElement.parentElement;
        const last_parent = up_parent.parentElement;
        const sections = document.querySelectorAll('.pcoded-hasmenu');
        for (let i = 0; i < sections.length; i++) {
          sections[i].classList.remove('active');
          sections[i].classList.remove('pcoded-trigger');
        }

        if (parent.classList.contains('pcoded-hasmenu')) {
          parent.classList.add('pcoded-trigger');
          parent.classList.add('active');
        } else if (up_parent.classList.contains('pcoded-hasmenu')) {
          up_parent.classList.add('pcoded-trigger');
          up_parent.classList.add('active');
        } else if (last_parent.classList.contains('pcoded-hasmenu')) {
          last_parent.classList.add('pcoded-trigger');
          last_parent.classList.add('active');
        }
      }
      if ((document.querySelector('app-navigation.pcoded-navbar').classList.contains('mob-open'))) {
        document.querySelector('app-navigation.pcoded-navbar').classList.remove('mob-open');
      }
    } else {
      setTimeout(() => {
        const sections = document.querySelectorAll('.pcoded-hasmenu');
        for (let i = 0; i < sections.length; i++) {
          sections[i].classList.remove('active');
          sections[i].classList.remove('pcoded-trigger');
        }

        let current_url = this.location.path();
        if (this.location['_baseHref']) {
          current_url = this.location['_baseHref'] + this.location.path();
        }
        const link = "a.nav-link[ href='" + current_url + "' ]";
        const ele = document.querySelector(link);
        if (ele !== null && ele !== undefined) {
          const parent = ele.parentElement;
          const up_parent = parent.parentElement.parentElement;
          const last_parent = up_parent.parentElement;
          if (parent.classList.contains('pcoded-hasmenu')) {
            parent.classList.add('active');
          } else if (up_parent.classList.contains('pcoded-hasmenu')) {
            up_parent.classList.add('active');
          } else if (last_parent.classList.contains('pcoded-hasmenu')) {
            last_parent.classList.add('active');
          }
        }
      }, 500);
    }
  }

}
