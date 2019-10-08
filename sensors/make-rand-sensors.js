#!/usr/bin/env node

const { readJson, getRandom, getRandomInt } = require('./common');

const Path = require('path');


if (process.argv.length !== 4 || !process.argv[3].match(/^\d+$/)) {
  console.error(`usage: ${Path.basename(process.argv[1])} ` +
		`SENSOR_TYPES_FILE N_SENSORS`);
  process.exit(1);
}

const [SENSOR_ID_BASE, SENSOR_ID_INC] = [ 97342, 22 ];
const [MIN_PERIOD, MAX_PERIOD] = [ 1, 101 ];

function setExpected(sensor) {
  const limits = sensor.limits;
  const [min, max] = [ Number(limits.min), Number(limits.max) ];
  const limitsSize = max - min;
  const range = getRandom(0.5, 0.9);
  const split = getRandom(0, 1-range);
  const expected = {
    min: String(min + Math.ceil(limitsSize*split)),
    max: String(min +  Math.ceil(limitsSize*(range + split))),
  };
  sensor.expected = expected;
}
function makeSensors(sensorInfos, nSensors) {
  const sensors = [];
  let [s, id] = [0, SENSOR_ID_BASE];
  for (let i = 0; i < nSensors; i++) {
    const sensorInfo = sensorInfos[s];
    const sensor = Object.create(sensorInfo);
    sensor.id = id.toString(36); sensor.model = sensorInfo.id;
    sensor.period = String(getRandomInt(MIN_PERIOD, MAX_PERIOD));
    setExpected(sensor);
    id += SENSOR_ID_INC; s = (s + 1)%sensorInfos.length;
    sensors.push(sensor);
  }
  return sensors;
}

async function go(fileName, nSensors) {
  nSensors = Number(nSensors);
  const sensorInfos = await readJson(fileName);
  const sensors = makeSensors(sensorInfos, nSensors);
  console.log(JSON.stringify(sensors, null, 2));
}

(async () => await go(...process.argv.slice(2)))();
