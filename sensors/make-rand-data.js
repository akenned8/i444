#!/usr/bin/env node

const { readJson, getRandom, getRandomInt } = require('./common');

const Path = require('path');


if (process.argv.length !== 5 || !process.argv[4].match(/^\d+$/)) {
  console.error(`usage: ${Path.basename(process.argv[1])} ` +
		`SENSOR_TYPES_FILE SENSORS_FILE N_DATA_PER_SENSOR`);
  process.exit(1);
}

const MAX_DEVIATION = 5;

function randSensorData(sensor) {
  let value;
  const isError = Math.random() < 0.1;
  if (isError) {
    value = (Math.random() < 0.5)
      ? Number(sensor.limits.min) - getRandomInt(1, MAX_DEVIATION)
      : Number(sensor.limits.max) + getRandomInt(1, MAX_DEVIATION)
  }
  else {
    const isOutOfRange = Math.random() < 0.2;
    if (isOutOfRange) {
      //value could also become an error
      value = (Math.random() < 0.5) 
	? Number(sensor.expected.min) - getRandomInt(1, MAX_DEVIATION)
	: Number(sensor.expected.max) + getRandomInt(1, MAX_DEVIATION);
    }
    else {
      const [min, max] =
	[ Number(sensor.expected.min), Number(sensor.expected.max) ];
      value = getRandom(min, max).toFixed(1);
    }
  }
  return value;
}

const PAST = 3600;

function makeData(sensors, nData) {
  const data = [];
  const t = Date.now() - PAST;
  for (let d = 0; d < nData; d++) {
    for (sensor of sensors) {
      const datum = {
	sensorId: sensor.id,
	timestamp: String(t - sensor.period*d),
	value: String(randSensorData(sensor)),
      };
      data.push(datum);
    }
  }
  return data;
}

async function go(infoFileName, sensorFileName, nData) {
  nData = Number(nData);
  const infosJson = await readJson(infoFileName);
  //const sensorInfos = Object.fromEntries(infosJson.map(i => [i.id, i]));
  const sensorInfos = {};
  infosJson.forEach(i => sensorInfos[i.id] = i);
  const sensorsJson = await readJson(sensorFileName);
  const sensors = sensorsJson.map(s => {
    const info = sensorInfos[s.model];
    return Object.assign(Object.create(info), s);
  });
  const data = makeData(sensors, nData);
  console.log(JSON.stringify(data, null, 2));
}

(async () => await go(...process.argv.slice(2)))();
