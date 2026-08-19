import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {LoadingLogoComponent} from "./loading-logo/loading-logo.component";

@NgModule({
  declarations: [
    LoadingLogoComponent
  ],
  exports: [
    LoadingLogoComponent
  ],
  imports: [
    CommonModule
  ]
})
export class HelpersModule {
  // getChartDebugMonitoring(){
  //       return  {
  //     id: '',
  //     series: [{
  //       name: 'value',
  //       data: [],
  //     }],
  //     chart: {
  //       height: 430,
  //       type: 'area',
  //       animations: {
  //         enabled: true,
  //         easing: 'easeinout',
  //         speed: 800,
  //         animateGradually: {
  //           enabled: true,
  //           delay: 150
  //         },
  //         dynamicAnimation: {
  //           enabled: true,
  //           speed: 350
  //         }
  //       }
  //     },
  //     dataLabels: {
  //       enabled: false
  //     },
  //     stroke: {
  //       show: true,
  //       curve: 'smooth',
  //       lineCap: 'butt',
  //       colors: undefined,
  //       width: 2,
  //       dashArray: 0,
  //     },
  //     foreColor: '#999',
  //     stacked: true,
  //     dropShadow: {
  //       enabled: true,
  //       enabledSeries: [0],
  //       top: -2,
  //       left: 2,
  //       blur: 5,
  //       opacity: 0.06
  //     },
  //     colors: ['#a978fa', 'green'],
  //     xaxis: {
  //       type: 'datetime',
  //       categories: [],
  //       labels: {
  //         style: {
  //           colors: [],
  //         },
  //       },
  //
  //       // title: {
  //       //   text: undefined,
  //       //   offsetX: 0,
  //       //   offsetY: 0,
  //       //   style: {
  //       //     color: '#fff',
  //       //     fontSize: '12px',
  //       //     fontFamily: 'Helvetica, Arial, sans-serif',
  //       //     fontWeight: 600,
  //       //     cssClass: 'apexcharts-xaxis-title',
  //       //   },
  //       // }
  //       // axisBorder: {
  //       //   show: true,
  //       //   color: '#78909C',
  //       //   height: 1,
  //       //   width: '100%',
  //       //   offsetX: 0,
  //       //   offsetY: 0
  //       // },
  //       // axisTicks: {
  //       //   show: true,
  //       //   borderType: 'solid',
  //       //   color: '#78909C',
  //       //   height: 6,
  //       //   offsetX: 0,
  //       //   offsetY: 0
  //       // },
  //     },
  //     tooltip: {
  //       x: {
  //         format: 'dd/MM/yy'
  //       },
  //     },
  //     fill: {
  //       colors: ['#a978fa'],
  //       // type: 'gradient',
  //       gradient: {
  //         // opacity: 1,
  //         // shade: '#a978fa',
  //         // type: "horizontal",
  //         // shadeIntensity: 0.5,
  //         // shadeIntensity: 1,
  //         // opacityFrom: 0.9,
  //         // opacityTo: 0.0,
  //         // stops: [0, 100]
  //       }
  //     },
  //     noData: {
  //       text: 'Loading',
  //       style: {}
  //     },
  //     // grid: {
  //     //   show: true,
  //     //   borderColor: '#90A4AE',
  //     //   strokeDashArray: 0,
  //     //   position: 'back',
  //     //   xaxis: {
  //     //     lines: {
  //     //       show: false
  //     //     }
  //     //   },
  //     //   yaxis: {
  //     //     lines: {
  //     //       show: false
  //     //     }
  //     //   },
  //     //   row: {
  //     //     colors: undefined,
  //     //     opacity: 0.5
  //     //   },
  //     //   column: {
  //     //     colors: undefined,
  //     //     opacity: 0.5
  //     //   },
  //     //   padding: {
  //     //     top: 0,
  //     //     right: 0,
  //     //     bottom: 0,
  //     //     left: 0
  //     //   },
  //     // }
  //   };
  // }
}
