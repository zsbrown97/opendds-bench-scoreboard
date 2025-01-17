import type {
  Padding,
  XAxisConfiguration,
  XAxisType,
  YAxisConfiguration,
  YAxisType
} from 'c3';
import type {ChartType, FormConfiguration, StatProperties} from '../types';
import {BY_SIZE, BY_TIMESTAMP, ChartFactoryData} from './chart-data-extractor';

type HasStatPropertiesOptions = {statProperties: StatProperties};
type HasColumnsOptions = Pick<ChartFactoryData, 'columns'>;
type HasNodesOptions = {hasNodes: boolean};
type HasLogScaleOptions = Pick<FormConfiguration, 'useLogScale'>;
type HasUseTimeSeriesOptions = Pick<FormConfiguration, 'useTimeSeries'>;

export const DEFAULT_CHART_HEIGHT = 500;

const DEFAULT_Y_TICK_FORMAT = function format(value: number): string {
  return Number.isInteger(value)
    ? value.toString()
    : parseFloat(value.toFixed(4)).toFixed(4);
};

export function yAxisConfigurationFactory(): YAxisConfiguration {
  return {
    label: {
      position: 'outer-middle',
      text: ''
    },
    // min: 0, // helps with log scale
    padding: {}, // helps with log scale
    tick: {
      format: DEFAULT_Y_TICK_FORMAT
    },
    type: 'linear'
  };
}

type AxisFactoryEntry = Record<
  ChartType,
  {x: XAxisConfiguration; y: YAxisConfiguration}
>;

export function axisFactory(): AxisFactoryEntry {
  return {
    'by size': {
      x: <XAxisConfiguration>{
        label: {
          position: 'outer-left'
        },
        type: 'category'
      },
      y: yAxisConfigurationFactory()
    },
    'by timestamp': {
      x: <XAxisConfiguration>{
        label: {
          position: 'outer-left',
          text: 'Timestamp'
        },
        //type: 'category',
        tick: {
          culling: false,
          fit: false,
          format: '%Y-%m-%d %H:%M:%S', // display format
          rotate: -90
        }
      },
      y: yAxisConfigurationFactory()
    }
  };
}

//----------------------------------------------------------------------------
// Pure Functions For Chart Data
//----------------------------------------------------------------------------
export function getAxisXLabel(
  {chartType}: FormConfiguration,
  {hasNodes}: HasNodesOptions
): string {
  return chartType === BY_TIMESTAMP
    ? 'timestamp'
    : hasNodes
    ? 'nodes'
    : 'payload size in bytes';
}

export function getAxisXTimeStampType({
  useTimeSeries
}: HasUseTimeSeriesOptions): XAxisType {
  return useTimeSeries ? 'timeseries' : 'category';
}

export function getAxisYConfigurationPartials({
  useLogScale
}: HasLogScaleOptions): Partial<YAxisConfiguration> {
  return {
    type: getAxisYType({useLogScale}),
    padding: getAxisYPadding({useLogScale})
  };
}

export function getAxisYTickFormat(
  {plotType}: FormConfiguration,
  {statProperties, columns}: HasStatPropertiesOptions & HasColumnsOptions
): (value: number) => string {
  const statProp = statProperties[plotType];
  if (statProp && statProp.units === 'seconds') {
    const {max} = getMaxAndMinValues({columns});
    return tickFormatForMax(max);
  }
  return DEFAULT_Y_TICK_FORMAT;
}

export function getAxisYLabel(
  {plotType, statName}: FormConfiguration,
  {statProperties}: HasStatPropertiesOptions
): string {
  if (!plotType) return '';
  const plotStatTypes = statProperties[plotType];
  const unit = plotStatTypes ? plotStatTypes.units : '';
  return [statName, unit].filter(i => i).join(' ');
}

export function getAxisYPadding({useLogScale}: HasLogScaleOptions): Padding {
  if (useLogScale) {
    return {bottom: 0};
  }
  return undefined;
}

export function getAxisYType({useLogScale}: HasLogScaleOptions): YAxisType {
  if (useLogScale) return 'log';
  return 'linear';
}

export const getLegendTitle = (
  {chartType}: FormConfiguration,
  {hasNodes}: HasNodesOptions
): string =>
  chartType === BY_SIZE
    ? 'Timestamp'
    : hasNodes
    ? 'Node Count'
    : 'Payload Bytes';

export function getMaxAndMinValues({columns}: HasColumnsOptions): {
  min: number;
  max: number;
} {
  if (!columns.length) return {max: 0, min: 0};

  let min = Number.MAX_VALUE;
  let max = Number.MIN_VALUE;

  for (const column of columns) {
    const [label, ...rest] = column;
    if (label !== 'x') {
      // Ignore zero values.
      const values = <number[]>(
        rest.filter(v => typeof v !== 'string').filter(v => v !== 0)
      );
      min = Math.min(min, ...values);
      max = Math.max(max, ...values);
    }
  }

  return {
    min,
    max
  };
}

function tickFormatForMax(max: number): (value: number) => string {
  if (max < 3) {
    // If max is under 3 seconds, convert to MS, with an ms for milliseconds
    return (value: number) => `${(value * 1000).toFixed(2)}ms`;
  } else if (max > 10000) {
    // If it's over 10000 convert it to exponential
    return (value: number) => `${value.toExponential(2)}`;
  } // Return the value with an s for seconds
  return (value: number) => `${value.toFixed(3)}s`;
}
