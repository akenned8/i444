'use strict';

const assert = require('assert');

class Sensors {

  constructor() {
    this.clear();
  }

  /** Clear out all data from this object. */
  async clear() {
    this.sensors= new Map();
    this.sensortypes= new Map();
    this.sensordata = new Map();
  }

  /** Subject to field validation as per FN_INFOS.addSensorType,
   *  add sensor-type specified by info to this.  Replace any
   *  earlier information for a sensor-type with the same id.
   *
   *  All user errors must be thrown as an array of objects.
   */
  async addSensorType(info) {
    const sensorType = validate('addSensorType', info);
    this.sensortypes.set(sensorType.id , sensorType);
  }
  
  /** Subject to field validation as per FN_INFOS.addSensor, add
   *  sensor specified by info to this.  Replace any earlier
   *  information for a sensor with the same id.
   *
   *  All user errors must be thrown as an array of objects.
   */
  async addSensor(info) {
    const sensor = validate('addSensor', info);
    if (!this.sensortypes.has(sensor.model)) {
      throw [ `no model ${sensor.model} sensor type` ];
    }

    this.sensors.set(sensor.id , sensor);
  }

  /** Subject to field validation as per FN_INFOS.addSensorData, add
   *  reading given by info for sensor specified by info.sensorId to
   *  this. Replace any earlier reading having the same timestamp for
   *  the same sensor.
   *
   *  All user errors must be thrown as an array of objects.
   */
  async addSensorData(info) {
    const sensorData = validate('addSensorData', info);
    if (!this.sensors.has(sensorData.sensorId)) {
      throw [ `no sensor with id ${sensorData.sensorId} when adding sensor data` ];
    }

    if(!this.sensordata.has(sensorData.sensorId)) {
      this.sensordata.set(sensorData.sensorId , [])
    }
    this.sensordata.get(sensorData.sensorId ).push(sensorData); 
  }

  /** Subject to validation of search-parameters in info as per
   *  FN_INFOS.findSensorTypes, return all sensor-types which
   *  satisfy search specifications in info.  Note that the
   *  search-specs can filter the results by any of the primitive
   *  properties of sensor types.  
   *
   *  The returned value should be an object containing a data
   *  property which is a list of sensor-types previously added using
   *  addSensorType().  The list should be sorted in ascending order
   *  by id.
   *
   *  The returned object will contain a lastIndex property.  If its
   *  value is non-negative, then that value can be specified as the
   *  index property for the next search.  Note that the index (when 
   *  set to the lastIndex) and count search-spec parameters can be used
   *  in successive calls to allow scrolling through the collection of
   *  all sensor-types which meet some filter criteria.
   *
   *
   *  All user errors must be thrown as an array of objects.
   */
  async findSensorTypes(info) {
    const searchSpecs = validate('findSensorTypes', info);
    
    /*error handling*/
    if (searchSpecs.id!==null && !this.sensortypes.has(searchSpecs.id)) {
      throw [ `unknown sensor id for sensor-type: ${searchSpecs.id}` ];
    }

    /*creating data structures, a sorted array for proper return order*/
    let sensortypesarr = []; 
    for(let temp of this.sensortypes.values()) {
      sensortypesarr.push(temp);
    }
    sensortypesarr.sort((a, b) => (a.id > b.id) ? 1: -1);

    /*retobj is the return object*/
    let retobj = {
      nextIndex: searchSpecs.index + searchSpecs.count,
      data: []
    };

/*option 1: we get the id and return from the map in O91)*/
    if(searchSpecs.id) {
      retobj.nextIndex = searchSpecs.index +1;
      retobj.data.push(this.sensortypes.get(searchSpecs.id));
      return retobj;
    }
    /*option2: all we have is index and count*/
    if(!(searchSpecs.id) && !(searchSpecs.manufacturer) && !(searchSpecs.modelNumber) && !(searchSpecs.quantity) && !(searchSpecs.unit)) {
      let counter = searchSpecs.index;
      while(counter < searchSpecs.index + searchSpecs.count) {
        retobj.data.push(sensortypesarr[counter]); 
        counter++; 
      }
    }
    /*option 3: we have other elements, like quantity=pressure*/
    else {
      retobj.nextIndex = -1;
      var counter = 0;
      for(let i = searchSpecs.index; i < sensortypesarr.length && counter < searchSpecs.count; i++) { 
          if(searchSpecs.manufacturer === sensortypesarr[i].manufacturer) {
            retobj.data.push(sensortypesarr[i]);
            counter++;
          }
          if(searchSpecs.modelNumber === sensortypesarr[i].modelNumber) {
            retobj.data.push(sensortypesarr[i]);
            counter++;
          }
          if(searchSpecs.quantity === sensortypesarr[i].quantity) {
            retobj.data.push(sensortypesarr[i]);
            counter++;
          }
          if(searchSpecs.unit === sensortypesarr[i].unit) {
            retobj.data.push(sensortypesarr[i]);
            counter++;
          } 
      } 
    } 
    return retobj;
  }
  
  /** Subject to validation of search-parameters in info as per
   *  FN_INFOS.findSensors, return all sensors which
   *  satisfy search specifications in info.  Note that the
   *  search-specs can filter the results by any of the primitive
   *  properties of a sensor.  
   *
   *  The returned value should be an object containing a data
   *  property which is a list of all sensors satisfying the
   *  search-spec which were previously added using addSensor().  The
   *  list should be sorted in ascending order by id.
   *
   *  If info specifies a truthy value for a doDetail property, 
   *  then each sensor S returned within the data array will have
   *  an additional S.sensorType property giving the complete 
   *  sensor-type for that sensor S.
   *
   *  The returned object will contain a lastIndex property.  If its
   *  value is non-negative, then that value can be specified as the
   *  index property for the next search.  Note that the index (when 
   *  set to the lastIndex) and count search-spec parameters can be used
   *  in successive calls to allow scrolling through the collection of
   *  all sensors which meet some filter criteria.
   *
   *  All user errors must be thrown as an array of objects.
   */
  async findSensors(info) {
    const searchSpecs = validate('findSensors', info);
    
    /*error handling*/
    if (searchSpecs.id !== null && !this.sensors.has(searchSpecs.id)) {
      throw [ `cannot find sensor for id: ${searchSpecs.id}` ];
    }

    /*Creating data structure, sorted array works best in this instance*/
    var sensorarr = [];
    for(var temp of this.sensors.values()) {
      sensorarr.push(temp);
    }
    sensorarr.sort((a, b) => (a.id > b.id) ? 1: -1);
    /*we return retobj*/
    let retobj = {
      nextIndex: searchSpecs.index + searchSpecs.count,
      data: []
    };

    /*Option 1: we get the id and return the matching sensor from the map O(1)*/
    if(searchSpecs.id) {
      retobj.nextIndex = searchSpecs.index +1;
      retobj.data.push(this.sensors.get(searchSpecs.id))
      if(searchSpecs.doDetail) retobj.sensorType = (this.sensortypes.get(this.sensors.get(searchSpecs.id).model));
      return retobj;
    }
    /*Option 2: all we get is index and count. we use the sorted array to return sensors ranked by id O(count)*/
    if(!(searchSpecs.id) && !(searchSpecs.model) && !(searchSpecs.period)) {
      var counter = searchSpecs.index;
      while(counter < searchSpecs.index + searchSpecs.count) {
        retobj.data.push(sensorarr[counter]);
        if(searchSpecs.doDetail) retobj.sensorType = (this.sensortypes.get(sensorarr[counter].model));
        counter++;
      }
    }
    /*Option 3: we have multiple parameters, like model=h3-47b*/
    else {
      /*counter makes sure we only return count number of sensors.*/
      let counter = 0;
      for(let i = searchSpecs.index; i < sensorarr.length && counter < searchSpecs.count; i++) { 
          if(searchSpecs.model === sensorarr[i].model) {
            retobj.data.push(sensorarr[i]);
            if(searchSpecs.doDetail) retobj.sensorType = (this.sensortypes.get(sensorarr[i].model));
            counter++;
          }
          if(searchSpecs.period === sensorarr[i].period) {
            retobj.data.push(sensorarr[i]);
            if(searchSpecs.doDetail) retobj.sensorType = (this.sensortypes.get(sensorarr[i].model));
            counter++;
          }
      }
    }
    retobj.data.sort((a, b) => (a.id > b.id) ? 1: -1);
    return retobj;
  }
  
  /** Subject to validation of search-parameters in info as per
   *  FN_INFOS.findSensorData, return all sensor reading which satisfy
   *  search specifications in info.  Note that info must specify a
   *  sensorId property giving the id of a previously added sensor
   *  whose readings are desired.  The search-specs can filter the
   *  results by specifying one or more statuses (separated by |).
   *
   *  The returned value should be an object containing a data
   *  property which is a list of objects giving readings for the
   *  sensor satisfying the search-specs.  Each object within data
   *  should contain the following properties:
   * 
   *     timestamp: an integer giving the timestamp of the reading.
   *     value: a number giving the value of the reading.
   *     status: one of "ok", "error" or "outOfRange".
   *
   *  The data objects should be sorted in reverse chronological
   *  order by timestamp (latest reading first).
   *
   *  If the search-specs specify a timestamp property with value T,
   *  then the first returned reading should be the latest one having
   *  timestamp <= T.
   * 
   *  If info specifies a truthy value for a doDetail property, 
   *  then the returned object will have additional 
   *  an additional sensorType giving the sensor-type information
   *  for the sensor and a sensor property giving the sensor
   *  information for the sensor.
   *
   *  Note that the timestamp and count search-spec parameters can be
   *  used in successive calls to allow scrolling through the
   *  collection of all readings for the specified sensor.
   *
   *  All user errors must be thrown as an array of objects.
   */
  async findSensorData(info) {
    const searchSpecs = validate('findSensorData', info);
    
    /*error handling*/
    if (!this.sensors.has(searchSpecs.sensorId)) {
      throw [ `unknown sensor id when retrieving sensor data: ${searchSpecs.sensorId}` ];
    }

    /*create list from everything in sensordata map, chop off any values not in timestamp range, sort*/
    let sensordataarr = this.sensordata.get(searchSpecs.sensorId);
    sensordataarr = sensordataarr.filter(e => e.timestamp <= searchSpecs.timestamp);
    sensordataarr.sort((a, b) => (a.timestamp < b.timestamp) ? 1: -1);

    let retobj = {
      data: []
    };
    
    let sensorinstance = this.sensors.get(searchSpecs.sensorId);

    let lowerLimit = (this.sensortypes.get(sensorinstance.model)).limits.min;
    let upperLimit = (this.sensortypes.get(sensorinstance.model)).limits.max;
    let lowerRange = (sensorinstance).expected.min;
    let upperRange = (sensorinstance).expected.max;

    let counter = 0;
    for(let i = 0; i < sensordataarr.length && counter < searchSpecs.count; i++) {
      /*retobj.data is going to be filled with obj Objects which hold the timestamp, value, and status */
      let obj = {};
      let current = sensordataarr[i];
      /*since we have the correct range, and its ordered, now we just need to check on the 3 status possibilities*/
      if(searchSpecs.statuses.has("ok") && (Number(current.value) >= lowerRange && Number(current.value) <= upperRange)) {
        obj.timestamp = sensordataarr[i].timestamp;
        obj.value = sensordataarr[i].value;
        obj.status = "ok";
        
        counter++;
      }
      else if(searchSpecs.statuses.has("error") && (Number(current.value) < lowerLimit || Number(current.value) > upperLimit)) {
        obj.timestamp = sensordataarr[i].timestamp;
        obj.value = sensordataarr[i].value;
        obj.status = "error";
        
        counter++;
      }
      else if(searchSpecs.statuses.has("outOfRange") && ((Number(current.value) < lowerRange && Number(current.value) >= lowerLimit) || (Number(current.value) <= upperLimit && Number(current.value) > upperRange))) {
        obj.timestamp = sensordataarr[i].timestamp;
        obj.value = sensordataarr[i].value;
        obj.status = "outOfRange";
        
        counter++;
      }
      else {
        continue;
      }
      retobj['data'].push(obj);
      if(searchSpecs.doDetail) {
        retobj.sensorType = this.sensortypes.get(sensorinstance.model);
        retobj.sensor = sensorinstance;
      } 
    }
    return retobj;
  }
  
  
}

module.exports = Sensors;

//@TODO add auxiliary functions as necessary

const DEFAULT_COUNT = 5;    

/** Validate info parameters for function fn.  If errors are
 *  encountered, then throw array of error messages.  Otherwise return
 *  an object built from info, with type conversions performed and
 *  default values plugged in.  Note that any unknown properties in
 *  info are passed unchanged into the returned object.
 */
function validate(fn, info) {
  const errors = [];
  const values = validateLow(fn, info, errors);
  if (errors.length > 0) throw errors; 
  return values;
}

function validateLow(fn, info, errors, name='') {
  const values = Object.assign({}, info);
  for (const [k, v] of Object.entries(FN_INFOS[fn])) {
    const validator = TYPE_VALIDATORS[v.type] || validateString;
    const xname = name ? `${name}.${k}` : k;
    const value = info[k];
    const isUndef = (
      value === undefined ||
      value === null ||
      String(value).trim() === ''
    );
    values[k] =
      (isUndef)
      ? getDefaultValue(xname, v, errors)
      : validator(xname, value, v, errors);
  }
  return values;
}

function getDefaultValue(name, spec, errors) {
  if (spec.default !== undefined) {
    return spec.default;
  }
  else {
    errors.push(`missing value for ${name}`);
    return;
  }
}

function validateString(name, value, spec, errors) {
  assert(value !== undefined && value !== null && value !== '');
  if (typeof value !== 'string') {
    errors.push(`require type String for ${name} value ${value} ` +
		`instead of type ${typeof value}`);
    return;
  }
  else {
    return value;
  }
}

function validateNumber(name, value, spec, errors) {
  assert(value !== undefined && value !== null && value !== '');
  switch (typeof value) {
  case 'number':
    return value;
  case 'string':
    if (value.match(/^[-+]?\d+(\.\d+)?([eE][-+]?\d+)?$/)) {
      return Number(value);
    }
    else {
      errors.push(`value ${value} for ${name} is not a number`);
      return;
    }
  default:
    errors.push(`require type Number or String for ${name} value ${value} ` +
		`instead of type ${typeof value}`);
  }
}

function validateInteger(name, value, spec, errors) {
  assert(value !== undefined && value !== null && value !== '');
  switch (typeof value) {
  case 'number':
    if (Number.isInteger(value)) {
      return value;
    }
    else {
      errors.push(`value ${value} for ${name} is not an integer`);
      return;
    }
  case 'string':
    if (value.match(/^[-+]?\d+$/)) {
      return Number(value);
    }
    else {
      errors.push(`value ${value} for ${name} is not an integer`);
      return;
    }
  default:
    errors.push(`require type Number or String for ${name} value ${value} ` +
		`instead of type ${typeof value}`);
  }
}

function validateRange(name, value, spec, errors) {
  assert(value !== undefined && value !== null && value !== '');
  if (typeof value !== 'object') {
    errors.push(`require type Object for ${name} value ${value} ` +
		`instead of type ${typeof value}`);
  }
  return validateLow('_range', value, errors, name);
}

const STATUSES = new Set(['ok', 'error', 'outOfRange']);

function validateStatuses(name, value, spec, errors) {
  assert(value !== undefined && value !== null && value !== '');
  if (typeof value !== 'string') {
    errors.push(`require type String for ${name} value ${value} ` +
		`instead of type ${typeof value}`);
  }
  if (value === 'all') return STATUSES;
  const statuses = value.split('|');
  const badStatuses = statuses.filter(s => !STATUSES.has(s));
  if (badStatuses.length > 0) {
    errors.push(`invalid status ${badStatuses} in status ${value}`);
  }
  return new Set(statuses);
}

const TYPE_VALIDATORS = {
  'integer': validateInteger,
  'number': validateNumber,
  'range': validateRange,
  'statuses': validateStatuses,
};


/** Documents the info properties for different commands.
 *  Each property is documented by an object with the
 *  following properties:
 *     type: the type of the property.  Defaults to string.
 *     default: default value for the property.  If not
 *              specified, then the property is required.
 */
const FN_INFOS = {
  addSensorType: {
    id: { }, 
    manufacturer: { }, 
    modelNumber: { }, 
    quantity: { }, 
    unit: { },
    limits: { type: 'range', },
  },
  addSensor:   {
    id: { },
    model: { },
    period: { type: 'integer' },
    expected: { type: 'range' },
  },
  addSensorData: {
    sensorId: { },
    timestamp: { type: 'integer' },
    value: { type: 'number' },
  },
  findSensorTypes: {
    id: { default: null },  //if specified, only matching sensorType returned.
    index: {  //starting index of first result in underlying collection
      type: 'integer',
      default: 0,
    },
    count: {  //max # of results
      type: 'integer',
      default: DEFAULT_COUNT,
    },
  },
  findSensors: {
    id: { default: null }, //if specified, only matching sensor returned.
    index: {  //starting index of first result in underlying collection
      type: 'integer',
      default: 0,
    },
    count: {  //max # of results
      type: 'integer',
      default: DEFAULT_COUNT,
    },
    doDetail: { //if truthy string, then sensorType property also returned
      default: null, 
    },
  },
  findSensorData: {
    sensorId: { },
    timestamp: {
      type: 'integer',
      default: Date.now() + 999999999, //some future date
    },
    count: {  //max # of results
      type: 'integer',
      default: DEFAULT_COUNT,
    },
    statuses: { //ok, error or outOfRange, combined using '|'; returned as Set
      type: 'statuses',
      default: new Set(['ok']),
    },
    doDetail: {     //if truthy string, then sensor and sensorType properties
      default: null,//also returned
    },
  },
  _range: { //pseudo-command; used internally for validating ranges
    min: { type: 'number' },
    max: { type: 'number' },
  },
};  

