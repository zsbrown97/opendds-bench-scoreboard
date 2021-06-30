export const MISSING_VALUE = -0.0000001;
export const BY_SIZE = 'by size';
export const BY_TIMESTAMP = 'by timestamp';

const FUNCTION_MAP = {
  [BY_TIMESTAMP]: getChartDataByTimestamp,
  [BY_SIZE]: getChartDataBySize
};

export function deriveClassNameFromTimestampKey(key) {
  const [date] = key.split('_');
  return date.split('+')[0].replaceAll('T', '_').replaceAll(':', '-');
}

export function classNameToDateTime(text) {
  const [date, time] = text.split('_');
  const newTime = time.replaceAll('-', ':');
  return date + ' ' + newTime;
}

export function chartDataFactory(type) {
  const fn = FUNCTION_MAP[type];
  if (!fn) throw new Error(`Chart data for ${type} is not currently supported`);

  return async (...args) => {
    const data = await fn(...args);
    return mutating_assignNames(data);
  };
}

export function mutating_assignNames(data) {
  data.names = {};
  for (const column of data.columns) {
    const name = column[0];
    if (name.includes('_')) data.names[name] = classNameToDateTime(name);
  }
  return data;
}

export function isFanScenario(scenario) {
  return (scenario || '').startsWith('fan_');
}

export async function getChartDataBySize(collectedData, opts) {
  const {timestamps, scenario, serverCount, plotType, statName} = opts;
  const isFan = isFanScenario(scenario);
  let data = {columns: [], x: 'x'};
  if (!scenario || !statName || !plotType) return data;

  const sizes = getSizes(collectedData, {scenario, serverCount});
  const arr = ['x', ...sizes];
  const columns = [arr];

  for (const timestamp of timestamps) {
    const column = [deriveClassNameFromTimestampKey(timestamp.key)];
    for (const size of sizes) {
      let value = MISSING_VALUE;
      const key = isFan ? size + '_' + serverCount : size;
      const dataPoint = collectedData[timestamp.key];
      let obj = dataPoint && dataPoint[scenario];
      if (obj) {
        obj = obj[key];
        if (obj) {
          const stats = obj[plotType];
          if (stats) value = stats[statName];
        }
      }

      column.push(value);
    }
    columns.push(column);
  }

  return {...data, columns};
}

export async function getChartDataByTimestamp(collectedData, opts) {
  const {timestamps, scenario, serverCount, plotType, statName} = opts;
  let data = {columns: [], x: 'x'};
  if (!scenario || !statName || !plotType) return data;
  const isFan = isFanScenario(scenario);
  // Load Data For Selected TimeStamps

  const xValues = timestamps.map(timestamp => timestamp.dateTime);
  const arr = ['x', ...xValues];
  const columns = [arr];

  const dataNames = getDataNames(collectedData, {scenario, isFan, serverCount});

  for (const dataName of dataNames) {
    const column = [dataName];

    for (const timestamp of timestamps) {
      let value = 0;
      const dataPoint = collectedData[timestamp.key];
      const dataForName = dataPoint && dataPoint[scenario];
      if (dataPoint) {
        const obj =
          dataForName[isFan ? dataName + '_' + serverCount : dataName];
        if (obj) {
          const stats = obj[plotType];
          if (stats) value = stats[statName];
        }
      }
      column.push(value);
    }

    columns.push(column);
  }
  console.log({columns});
  const xFormat = '%Y-%m-%d %H:%M:%S'; // date format
  return {...data, columns, xFormat};
}

export function getSizes(collectedData, {scenario, serverCount}) {
  const isFan = isFanScenario(scenario);
  const sizes = new Set();

  for (const timestampObj of Object.values(collectedData)) {
    const scenarioObj = timestampObj[scenario];
    if (scenarioObj) {
      for (const scenarioSize of Object.keys(scenarioObj)) {
        if (!isFan || scenarioSize.endsWith('_' + serverCount)) {
          sizes.add(isFan ? scenarioSize.split('_')[0] : scenarioSize);
        }
      }
    }
  }

  return [...sizes].sort((n1, n2) => Number(n1) - Number(n2));
}

export function getDataNames(collectedData, {scenario, serverCount}) {
  const isFan = isFanScenario(scenario);
  const dataNames = new Set();
  for (const timestampObj of Object.values(collectedData)) {
    const scenarioObj = timestampObj[scenario];
    if (scenarioObj) {
      for (const dataName of Object.keys(scenarioObj)) {
        if (!isFan || dataName.endsWith('_' + serverCount)) {
          dataNames.add(isFan ? dataName.split('_')[0] : dataName);
        }
      }
    }
  }
  return [...dataNames].sort((n1, n2) => Number(n1) - Number(n2));
}
