import {Component, Input, OnInit} from '@angular/core';
import {NavigationItem} from '../../../layout/admin/navigation/navigation';
import {Router} from '@angular/router';
import {Title} from '@angular/platform-browser';
import {AuthData, AuthenticationService} from "../../../../services/auth.service";
import { LanguageService } from 'src/app/language/language.service';

@Component({
    selector: 'app-breadcrumb',
    templateUrl: './breadcrumb.component.html',
    styleUrls: ['./breadcrumb.component.scss'],
    standalone: false
})
export class BreadcrumbComponent implements OnInit {
  @Input() type: string;
  public invitedLinkIsClickedRight = false;
  public invitedLinkIsClickedLeft = false;
  public classLink: string = 'invited-link';

  public navigation: any;
  public currentRoute: string = '';
  breadcrumbList: Array<any> = [];
  public navigationList: Array<any> = [];
  public isManager: boolean;
  public userId: number;
  public authData: AuthData;

  constructor(private route: Router,
              public nav: NavigationItem,
              private titleService: Title,
              private AuthService: AuthenticationService,
              public translateService: LanguageService) {
    this.navigation = this.nav.get();
    this.type = 'theme2';
    this.setBreadcrumb();
  }

  ngOnInit() {
    this.translateService.onLangChange.subscribe(() => {
      this.loadTranslations();
      if (this.currentRoute) {
        this.filterNavigation(this.currentRoute);
      }
    });
    this.authData = this.AuthService.authData;
    this.isManager = this.authData.userRole === 'manager';
    this.userId = this.authData.userId;
    this.setBreadcrumb();
  }
  loadTranslations(): void {
    this.translateService.get([
      'navigation.pending',
      'navigation.company_rules',
      'navigation.main_wall',
      'navigation.personal_schedule',
      'navigation.company_calendar',
      'navigation.tasks_manager',
      'navigation.task_list',
      'navigation.people',
      'navigation.tslen_meet',
      'navigation.meet',
      'navigation.ip_checker',

    ]).subscribe((transition)=>{
          if(this.navigationList[0]){
            this.navigationList[0].title = transition['navigation.tasks_manager'];
          }
          const entries = Object.entries(transition);
          const firstHalf = Object.fromEntries(entries.slice(0, 2));
          const secondHalf =  Object.fromEntries(entries.slice(2, 9));
          if('admin' in this.navigation[1]){
            this.navigateTraslation(1, firstHalf)
          }
          if(this.navigation[0].children){
            this.navigateTraslation(0, secondHalf)
          }
    })
  }
  navigateTraslation(index, data){
    const children = this.navigation[index].children;
      if (children) {
        const lengthTranslation = Object.keys(data)
        for(let i = 0; i<lengthTranslation.length; i++){
            children[i].title = data[lengthTranslation[i]]
        }
      }
  }

  setBreadcrumb() {
    let routerUrl: string;
    this.route.events.subscribe((router: any) => {
      routerUrl = router.urlAfterRedirects;
      if (routerUrl && typeof routerUrl === 'string') {
        this.breadcrumbList.length = 0;
        this.currentRoute = router.urlAfterRedirects
        this.filterNavigation(this.currentRoute);
      }
    });
  }

  filterNavigation(activeLink) {
    let result = [];
    let title = 'Welcome';
    const urlParams = this.route.url.split('/').pop().split(';');

    const id = parseInt(urlParams[0], 10);
    if (id && id > 0) {
      activeLink = activeLink.replace('/' + urlParams.join(';'), '');
      activeLink += '/:id';
    }

    this.navigation.forEach((a) => {

      if (a.type === 'item' && 'url' in a && a.url === activeLink) {
        result = [
          {
            url: ('url' in a) ? a.url : false,
            title: a.title,
            breadcrumbs: ('breadcrumbs' in a) ? a.breadcrumbs : true,
            type: a.type
          }
        ];
        title = a.title;
      } else {
        if (a.type === 'group' && 'children' in a) {
          a.children.forEach((b) => {
            if (b.type === 'item' && 'url' in b && b.url === activeLink) {
              result = [
                {
                  url: ('url' in b) ? b.url : false,
                  title: b.title,
                  breadcrumbs: ('breadcrumbs' in b) ? b.breadcrumbs : true,
                  type: b.type
                }
              ];
              title = b.title;
              if (b.useCustomTemplate) {
                result = b.customTemplateRoute.concat(result);
                if (urlParams.length > 1) {
                  if (urlParams[1]){
                    result[result.length - 1].title = this.decodeUrlRecursive(urlParams[1].split('=')[1]) + ` #${id}`;
                  }
                }
              }

            } else {
              if (b.type === 'collapse' && 'children' in b) {

                b.children.forEach((c) => {
                  if (c.type === 'item' && 'url' in c && c.url === activeLink) {
                    result = [
                      {
                        url: ('url' in b) ? b.url : false,
                        title: b.title,
                        breadcrumbs: ('breadcrumbs' in b) ? b.breadcrumbs : true,
                        type: b.type
                      },
                      {
                        url: ('url' in c) ? c.url : false,
                        title: c.title,
                        breadcrumbs: ('breadcrumbs' in c) ? c.breadcrumbs : true,
                        type: c.type
                      }
                    ];
                    title = c.title;
                  } else {
                    if (c.type === 'collapse' && 'children' in c) {
                      c.children.forEach((d) => {
                        if (d.type === 'item' && 'url' in d && d.url === activeLink) {
                          result = [
                            {
                              url: ('url' in b) ? b.url : false,
                              title: b.title,
                              breadcrumbs: ('breadcrumbs' in b) ? b.breadcrumbs : true,
                              type: b.type
                            },
                            {
                              url: ('url' in c) ? c.url : false,
                              title: c.title,
                              breadcrumbs: ('breadcrumbs' in c) ? c.breadcrumbs : true,
                              type: c.type
                            },
                            {
                              url: ('url' in d) ? d.url : false,
                              title: d.title,
                              breadcrumbs: ('breadcrumbs' in c) ? d.breadcrumbs : true,
                              type: d.type
                            }
                          ];
                          title = d.title;
                        }
                      });
                    }
                  }
                });
              }
            }
          });
        }
      }
    });
    this.navigationList = result;
    this.translateService.get(title).subscribe(translatedTitle => {
      this.titleService.setTitle(`${translatedTitle} | CRM`);
    });
  }
  decodeUrlRecursive(url: string, previousUrl: string = ''){
    if (url === previousUrl){
      return url;
    }
    const decodedUrl = decodeURI(url);

    return this.decodeUrlRecursive(decodedUrl, url);

  }

}
