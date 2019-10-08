#!/usr/bin/env node

const fs = require('fs');
const util = require('util');
const readFile = util.promisify(fs.readFile);

async function readJson(path) {
  try {
    const text = await readFile(path, 'utf8');
    return JSON.parse(text);
  }
  catch (err) {
    console.error('cannot read %s: %s', path, err);
    process.exit(1);
  }
}

//Random fns from <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random>

function getRandom(min, max=1) {
  return Math.random() * (max - min) + min;
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

module.exports = {
  readJson,
  getRandom,
  getRandomInt,
};

