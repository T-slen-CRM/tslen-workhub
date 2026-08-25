import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import {BehaviorSubject, Subscription} from "rxjs";
import {DataService} from "./data.service";

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
     isDarkTheme: BehaviorSubject<boolean>;
     subscriptions: Subscription;
    private _isDarkTheme: boolean;
    private _darkThemeColor: string;
    private _whiteThemeColor: string;

    constructor(private http: HttpClient,
                private dataService: DataService) {
        this.isDarkTheme = new BehaviorSubject(false);
        this.subscriptions = new Subscription();
        this._darkThemeColor = 'papayawhip';
        this._whiteThemeColor = '#000000';
    }
    changeThemeColor(){
        const body = document.getElementsByTagName('body')[0];
        if (body.classList.contains('dark-theme')){
            body.classList.remove('dark-theme');
            this.isDarkTheme.next(false);
        } else {
            body.classList.add('dark-theme');
            this.isDarkTheme.next(true);
        }
        return true
    }

    setThemeColor(isDarkTheme){
        this.isDarkTheme.next(isDarkTheme);
        this._isDarkTheme = isDarkTheme;
        const body = document.getElementsByTagName('body')[0];
        if (isDarkTheme){
            body.classList.add('dark-theme');
        } else {
            body.classList.remove('dark-theme');
        }
    }
    isDarkThemeCheck(){
        const body = document.getElementsByTagName('body')[0];
        return body.classList.contains('dark-theme');
    }

    public get mode(){
        return this._isDarkTheme
    }
    public get darkThemeColor(){
        return this._darkThemeColor
    }
    public get whiteThemeColor(){
        return this._whiteThemeColor
    }
    changeApexBarChartColors(chart: any, mode){
        const color = mode ? this.darkThemeColor : this.whiteThemeColor;
        //chartDailySpend
        chart.yaxis = {labels: {style: {colors: [color]}}};
        chart.xaxis.labels.style.colors = color;
        // for (let i = 0; i < chart.xaxis.categories.length; i++){
        //     chart.xaxis.labels.style.colors.push(color);
        // }
        chart.legend.labels = {
          colors: [color],
          useSeriesColors: false
        }
        chart.noData.style = {color: color};
//tooltips
        if (this.isDarkTheme){
            // chart.tooltip.fillSeriesColor = true;
            // chart.tooltip.theme = true;
        } else {
            //chartDailySpend
            // chart.tooltip = {y: {formatter: (val) => val+' $'}};
            // chart.tooltip.fillSeriesColor = false;
            // chart.tooltip.theme = false;
        }
        //assign
        chart = Object.assign({}, chart);
        return chart
    }
    // public set mode(value: boolean){
    //     this._isDarkTheme = value
    // }
}

