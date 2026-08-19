
interface ISystemMonitorItem {
  title: string;
  color: string;
  count: number;
  metric: string;
}

export interface ISystemMonitorItems extends Array<ISystemMonitorItem>{}

interface IResultMetric {
  [key: string]: any;
}

interface IMetricDataResult {
  metric: IResultMetric;
}

export interface IMetricDataResultMatrix extends IMetricDataResult {
  values: [number, string][];
}

export interface IMetricDataResultVector extends IMetricDataResult {
  value: [number, string];
}

interface IMetricData {
  resultType: 'matrix' | 'vector';
  result: IMetricDataResultMatrix | IMetricDataResultVector;
}

export interface IMetric {
  status: string;
  data: IMetricData;
}

export interface IMetricChartData {
  time: Date;
  [key: string]: any;
}

interface IMetricQueryBodyParams {
  start?: number;
  end?: number;
  time?: number;
  step?: number;
}

export interface IMetricQueryOptions {
  metricNumbers?: number[];
}

export interface IMetricQueryBody {
  metric: string;
  body: IMetricQueryBodyParams;
  campaignId: number;
  metricNumbers?: number[];
  creativeId?: number;
}

export interface IMetricMonitorConfig {
  metric: string;
  tittle: string;
  metricNumbers?: number[];
  component?: any;
  cid?: boolean;
  crid?: boolean;
  color?: string;
}
