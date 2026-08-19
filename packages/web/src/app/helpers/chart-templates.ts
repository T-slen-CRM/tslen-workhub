export class ChartTemplates {
    getChartDebugMonitoring(){
        return  {
            id: '',
            series: [{
                name: 'value',
                data: [],
            }],
            chart: {
                height: 200,
                type: 'area',
                animations: {
                    enabled: true,
                    easing: 'easeinout',
                    speed: 800,
                    animateGradually: {
                        enabled: true,
                        delay: 150
                    },
                    dynamicAnimation: {
                        enabled: true,
                        speed: 350
                    }
                }
            },
            dataLabels: {
                enabled: false
            },
            stroke: {
                show: true,
                curve: 'smooth',
                lineCap: 'butt',
                colors: undefined,
                width: 2,
                dashArray: 0,
            },
            foreColor: '#999',
            stacked: true,
            dropShadow: {
                enabled: true,
                enabledSeries: [0],
                top: -2,
                left: 2,
                blur: 5,
                opacity: 0.06
            },
            colors: ['#1dd5d2', 'green'],
            xaxis: {
                type: 'datetime',
                categories: [],
                labels: {
                    style: {
                        colors: [],
                    },
                },
            },
            tooltip: {
                    y:
                        {formatter: (val) => val},
                    x:
                        {format: 'HH:mm:ss'}
            },
            fill: {
                colors: ['#1dd5d2'],
                gradient: {
                }
            },
            noData: {
                text: 'No data',
                style: {}
            },
        };
    }
    getRadialChart(){
        return {
            series: [

            ],
            chart: {
                height: 200,
                type: "radialBar",
                offsetY: -10,
                animations: {
                    enabled: true,
                    easing: 'easeinout',
                    speed: 800,
                    animateGradually: {
                        enabled: true,
                        delay: 150
                    },
                    dynamicAnimation: {
                        enabled: true,
                        speed: 350
                    }
                }
            },
            plotOptions: {
                radialBar: {
                    startAngle: -135,
                    endAngle: 135,
                    dataLabels: {
                        name: {
                            show: false,
                            fontSize: "16px",
                            color: '#111',
                            offsetY: 120
                        },
                        value: {
                            offsetY: 76,
                            fontSize: "22px",
                            color: undefined,
                            formatter: function(val) {
                                return val + "%";
                            }
                        }
                    }
                }
            },

            fill: {
                colors: ["#ABE5A1"],
                type: "gradient",
                gradient: {
                    shade: "dark",
                    type: "horizontal",
                    shadeIntensity: 0.5,
                    gradientToColors: ["#ABE5A1"],
                    inverseColors: true,
                    opacityFrom: 1,
                    opacityTo: 1,
                    colorStops: []
                }
            },
            noData: {
                text: 'No data',
                style: {}
            },
            tooltip: {
            },
            stroke: {
                dashArray: 4
            },
            labels: ["Median Ratio"],
            xaxis: {
                type: 'datetime',
                categories: [],
                labels: {
                    style: {
                        colors: [],
                    },
                },
            },
        };
    }
    getColorStops(value){
        let colorStops = [
            {
                offset: 0,
                color: "#ABE5A1",
                opacity: 1
            },
            {
                offset: 100,
                color: "#ABE5A1",
                opacity: 1
            }
        ];
        if (value > 50 && value < 70){
            colorStops = [
                {
                    offset: 0,
                    color: "#ABE5A1",
                    opacity: 1
                },
                {
                    offset: 70,
                    color: "#ABE5A1",
                    opacity: 1
                },
                {
                    offset: 100,
                    color: '#ffb000',
                    opacity: 1
                },
            ];
        } else if (value >= 70){
            colorStops = [
                {
                    offset: 0,
                    color: "#ABE5A1",
                    opacity: 1
                },
                {
                    offset: 50,
                    color: "#ABE5A1",
                    opacity: 1
                },
                {
                    offset: 70,
                    color: '#ffb000',
                    opacity: 1
                },
                {
                    offset: 100,
                    color: "#EB656F",
                    opacity: 1
                },
            ];
        }
        return colorStops
    }
}
