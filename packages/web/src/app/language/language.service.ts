import { Injectable } from '@angular/core';
import { TranslateService, LangChangeEvent } from '@ngx-translate/core';
import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import localeUk from '@angular/common/locales/uk';
import localeRu from '@angular/common/locales/ru';
import localeFr from '@angular/common/locales/fr';
import localeEs from '@angular/common/locales/es';
import { Observable } from 'rxjs';
import { AuthenticationService } from '../services/auth.service';
import { DataService } from '../services/data.service';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  public calendarLocale = 'en';
  public masLanguage = ['uk', 'en', 'ru', 'fr', 'es']

  constructor(
    private translateService: TranslateService,
    private auth: AuthenticationService,
    private dataService: DataService,
  ) {
    registerLocaleData(localeEn, 'en');
    registerLocaleData(localeUk, 'uk');
    registerLocaleData(localeRu, 'ru');
    registerLocaleData(localeFr, 'fr');
    registerLocaleData(localeEs, 'es');
  }

  public changeLang(lang: string): void {
    this.usingLang(lang)
    const user = this.auth.authDataSignal();
    this.dataService.updateData('/users/', user.id, { language: lang }).subscribe({});
    const supportedLocales = this.masLanguage;
    this.calendarLocale = supportedLocales.includes(lang) ? lang : 'en';
  }

  public changeLangBrowser(lang: string): void {
     this.usingLang(lang)
  }

  private usingLang(lang: string){
    this.translateService.use(lang);
    this.translateService.setDefaultLang(lang);
    this.calendarLocale = lang;
  }
  public get currentLang(): string {
    return this.translateService.currentLang || 'en';
  }
  public get onLangChange(): Observable<LangChangeEvent> {
    return this.translateService.onLangChange;
  }
  public get(key: string | string[]) {
    return this.translateService.get(key);
  }
  public setDefaultLangFromBrowser() {
    const supportedLocales = this.masLanguage;
    const browserLang = navigator.language.split('-')[0];
    const defaultLang = supportedLocales.includes(browserLang) ? browserLang : 'en';

    this.translateService.addLangs(supportedLocales);
    this.translateService.setDefaultLang(defaultLang);
    this.translateService.use(defaultLang);
    this.calendarLocale = defaultLang;

    return defaultLang;
}

}