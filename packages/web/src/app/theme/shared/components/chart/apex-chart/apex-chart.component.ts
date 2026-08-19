import {Component, Input, SimpleChange, OnChanges, AfterViewInit} from '@angular/core';
import ApexCharts from 'apexcharts/dist/apexcharts.common.js';
import {ApexChartService} from './apex-chart.service';

@Component({
    selector: 'app-apex-chart',
    templateUrl: './apex-chart.component.html',
    styleUrls: ['./apex-chart.component.scss'],
    standalone: false
})
export class ApexChartComponent implements OnChanges, AfterViewInit {
  @Input() chartID: string;
  @Input() chartConfig: any;
  @Input() xAxis: any;
  @Input() newData: any;
  @Input() test: any;

  public chart: any;

  constructor(private apexEvent: ApexChartService) { }

  // ngOnInit() {
  //   setTimeout(() => {
  //    // if (this.chartConfig.series.length !== 0) {
  //       this.chart = new ApexCharts(document.querySelector('#' + this.chartID), this.chartConfig);
  //       this.chart.render();
  //       // this.chart.updateSeries([{
  //       //   data: this.chartConfig
  //       // }]);
  //    // }
  //   }, 350);
  //
  //   this.apexEvent.changeTimeRange.subscribe(() => {
  //     if (this.xAxis) {
  //       this.chart.updateOptions({
  //         xaxis: this.xAxis
  //       });
  //     }
  //   });
  //
  //   this.apexEvent.changeSeriesData.subscribe(() => {
  //     if (this.newData) {
  //       this.chart.updateSeries([{
  //         data: this.newData
  //       }]);
  //     }
  //   });
  // }
  // tslint:disable-next-line:use-lifecycle-interface
  ngOnChanges(changes: { [property: string]: SimpleChange }) {
      // this.chart = new ApexCharts(document.querySelector('#' + this.chartID), this.chartConfig);
      // this.chart.updateOptions(this.chartConfig);

    if (this.chart) {
      // this.chart.destroy();

      setTimeout(() => {
        this.chart.destroy();
        this.chart = new ApexCharts(document.querySelector('#' + this.chartID), this.chartConfig);
        this.chart.render();
        //this.chart.updateOptions(this.chartConfig)
        // this.chart = new ApexCharts(document.querySelector('#' + this.chartID), this.chartConfig);
        // this.chart.render();


        // this.chart.updateSeries(this.newData);

      }, 0);
    }
    // if (this.chartConfig.id === 'chartDailySpend' && this.chart && this.newData === 'true') {
    //   ApexCharts.exec('mychart', 'updateOptions', {
    //     xaxis: {
    //       labels: {
    //         show: false
    //       }
    //     }
    //   }, false, true);
    //   // this.chart = new ApexCharts(document.querySelector('#' + this.chartID), this.chartConfig);
    //   // this.chart.destroy();
    //   // setTimeout(() => {
    //   //     this.chart = new ApexCharts(document.querySelector('#' + this.chartID), this.chartConfig);
    //   //     this.chart.render();
    //   //   });
    // }
    // var chart = new ApexCharts(this.chartID, options);
    // chart.render();

    // this.chart.updateSeries([{
    //   data: changes.chartConfig.currentValue.series[0].data
    // }]);
    // this.chart.updateSeries([{
    //   name: 'Sales',
    //   data: response
    // }])
    // Extract changes to the input property by its name
    // const change: SimpleChange = changes.chartConfig;
    // if (!changes.chartConfig.currentValue.series[0].data) {
    // }
    // this.options = changes.chartConfig.currentValue;
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      // if (this.chartConfig.series.length !== 0) {
      this.chart = new ApexCharts(document.querySelector('#' + this.chartID), this.chartConfig);
      this.chart.render();
      // this.chart.updateSeries([{
      //   data: this.chartConfig
      // }]);
      // }
    }, 350);

    this.apexEvent.changeTimeRange.subscribe(() => {
      if (this.xAxis) {
        this.chart.updateOptions({
          xaxis: this.xAxis
        });
      }
    });

    this.apexEvent.changeSeriesData.subscribe(() => {
      if (this.newData) {
        this.chart.updateSeries([{
          data: this.newData
        }]);
      }
    });
  }

}
