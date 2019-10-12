'use strict';

const AppError = require('./app-error');
const validate = require('./validate');

const assert = require('assert');
const mongo = require('mongodb').MongoClient;

class Sensors {

  constructor(client, db) {
    this.client = client;
    this.db = db;
  }

  /** Return a new instance of this class with database as
   *  per mongoDbUrl.  Note that mongoDbUrl is expected to
   *  be of the form mongodb://HOST:PORT/DB.
   */
  static async newSensors(mongoDbUrl) {
    const mongodata = mongoDbUrl.match(/mongodb:\/\/(\S+):(\S+)\/(\S+)/) ;

    if(!mongodata) {
      const err = `invalid mongodb url`;
      throw [ new AppError('X_ID', err) ];
    }

    const client = await mongo.connect(mongoDbUrl, {useNewUrlParser:true , useUnifiedTopology:true});
    const db = client.db(mongodata[3]);
    return new Sensors(client, db);
  }

  /** Release all resources held by this Sensors instance.
   *  Specifically, close any database connections.
   */
  async close() {
    await this.client.close();
  }

  /** Clear database */
  async clear() {
    this.db.dropDatabase();
  }

  /** Subject to field validation as per validate('addSensorType',
   *  info), add sensor-type specified by info to this.  Replace any
   *  earlier information for a sensor-type with the same id.
   *
   *  All user errors must be thrown as an array of AppError's.
   */
  async addSensorType(info) {
    const sensorType = validate('addSensorType', info);
    const ret = await this.db.collection('SensorTypes').update(sensorType, sensorType, {upsert:true});  
    return ret;       
  }

  /** Subject to field validation as per validate('addSensor', info)
   *  add sensor specified by info to this.  Note that info.model must
   *  specify the id of an existing sensor-type.  Replace any earlier
   *  information for a sensor with the same id.
   *
   *  All user errors must be thrown as an array of AppError's.
   */
  async addSensor(info) {
    const sensor = validate('addSensor', info);

    /*if a sensor without a sensor type is trying to insert, throw error*/
    let typecollection = this.db.collection('SensorTypes');
    const res = await typecollection.findOne({id: sensor.model});
    if(!res) {
      const err = `the sensor model: ${sensor.model} does not have a corresponding sensor type`;
      throw [ new AppError('X_ID', err) ];
    }

    /*it has passed the error handling, will now insert*/
    const ret = await this.db.collection('Sensors').update(sensor, sensor, {upsert:true});
  }

  /** Subject to field validation as per validate('addSensorData',
   *  info), add reading given by info for sensor specified by
   *  info.sensorId to this. Note that info.sensorId must specify the
   *  id of an existing sensor.  Replace any earlier reading having
   *  the same timestamp for the same sensor.
   *
   *  All user errors must be thrown as an array of AppError's.
   */
  async addSensorData(info) {
    const sensorData = validate('addSensorData', info);

    /*error handling - making sure the id attached to this data is a valid sensor in Sensors collection*/
    let senscollection = this.db.collection('Sensors');
    const res = await senscollection.findOne({id: sensorData.sensorId});
    if(!res) {
      const err = `the data's sensor id: ${sensorData.sensorId} does not have a corresponding sensor`;
      throw [ new AppError('X_ID', err) ];
    }
    /*error handling passed, now inserting*/
    const ret = await this.db.collection('SensorDatas').update(sensorData, sensorData, {upsert:true});
  }

  /** Subject to validation of search-parameters in info as per
   *  validate('findSensorTypes', info), return all sensor-types which
   *  satisfy search specifications in info.  Note that the
   *  search-specs can filter the results by any of the primitive
   *  properties of sensor types (except for meta-properties starting
   *  with '_').
   *
   *  The returned value should be an object containing a data
   *  property which is a list of sensor-types previously added using
   *  addSensorType().  The list should be sorted in ascending order
   *  by id.
   *
   *  The returned object will contain a lastIndex property.  If its
   *  value is non-negative, then that value can be specified as the
   *  _index meta-property for the next search.  Note that the _index
   *  (when set to the lastIndex) and _count search-spec
   *  meta-parameters can be used in successive calls to allow
   *  scrolling through the collection of all sensor-types which meet
   *  some filter criteria.
   *
   *  All user errors must be thrown as an array of AppError's.
   */
  async findSensorTypes(info) {
    //@TODO
    const searchSpecs = validate('findSensorTypes', info);
    let tempindex = searchSpecs._index;
    let tempcount = searchSpecs._count;
    delete searchSpecs._index;
    delete searchSpecs._count;


    let retobj = {
      data: [],
      nextIndex: -1  
    };
    if(tempindex != 0) {
      retobj.nextIndex = tempindex + tempcount;
    }
    
    let collection = this.db.collection('SensorTypes');

    /*if searchSpecs gives an id return that sensor*/
    if(searchSpecs.id) {
      try {
        let res = await collection.findOne({id:searchSpecs.id});
        retobj.data.push(res);
      } 
      catch (err) { 
        throw [ new AppError('X_ID', err) ];
      } finally {}
    }
    /*if specifying other parameters*/
    else {
      delete searchSpecs.id;
      try {
        let res = await collection.find(searchSpecs).sort({id:1}).skip(tempindex).limit(tempcount).toArray();
        for(let x of res) {
          delete x._id;
          retobj.data.push(x);
        } 
      }
      catch(err) {
        throw [ new AppError('X_ID', err) ];
      }finally{}
       
    }

    return retobj;
  }

  /** Subject to validation of search-parameters in info as per
   *  validate('findSensors', info), return all sensors which satisfy
   *  search specifications in info.  Note that the search-specs can
   *  filter the results by any of the primitive properties of a
   *  sensor (except for meta-properties starting with '_').
   *
   *  The returned value should be an object containing a data
   *  property which is a list of all sensors satisfying the
   *  search-spec which were previously added using addSensor().  The
   *  list should be sorted in ascending order by id.
   *
   *  If info specifies a truthy value for a _doDetail meta-property,
   *  then each sensor S returned within the data array will have an
   *  additional S.sensorType property giving the complete sensor-type
   *  for that sensor S.
   *
   *  The returned object will contain a lastIndex property.  If its
   *  value is non-negative, then that value can be specified as the
   *  _index meta-property for the next search.  Note that the _index (when
   *  set to the lastIndex) and _count search-spec meta-parameters can be used
   *  in successive calls to allow scrolling through the collection of
   *  all sensors which meet some filter criteria.
   *
   *  All user errors must be thrown as an array of AppError's.
   */
  async findSensors(info) {
    const searchSpecs = validate('findSensors', info);
    /*storing data that is unnecessary to the .find() in separate vars, then deleting from Search Specs*/
    let tempindex = searchSpecs._index;
    let tempcount = searchSpecs._count;
    delete searchSpecs._index;
    delete searchSpecs._count;
    let doDetail;
    if(searchSpecs.doDetail)  {
      doDetail = searchSpecs.doDetail;
      delete searchSpecs.doDetail;
    }
    let retobj = {
      data: [],
      nextIndex: -1  
    };
    if(tempindex != 0) {
      retobj.nextIndex = tempindex + tempcount;
    }
    
    let collection = this.db.collection('Sensors');
    let collectionoftypes = this.db.collection('SensorTypes');

    /*if searchSpecs gives an id return that sensor*/
    if(searchSpecs.id) {
      try {
        let res = await collection.findOne({id:searchSpecs.id});
        retobj.data.push(res);
      } 
      catch (err) { 
        throw [ new AppError('X_ID', err) ];
      } finally {}
    }

    else {
      delete searchSpecs.id;
      try {
        let res = await collection.find(searchSpecs).sort({id:1}).skip(tempindex).limit(tempcount).toArray();
        for(let x of res) {
          delete x._id;
          retobj.data.push(x);
        }   
      }
      catch(err) {
        throw [ new AppError('X_ID', err) ];
      }finally{}
       
    }

    if (doDetail) {
      for (const sensor of retobj.data) {
        let detaildata = await collectionoftypes.findOne({id:sensor.model})
        sensor.sensorType = detaildata;
      }
    }
    return retobj;
  }

  /** Subject to validation of search-parameters in info as per
   *  validate('findSensorData', info), return all sensor readings
   *  which satisfy search specifications in info.  Note that info
   *  must specify a sensorId property giving the id of a previously
   *  added sensor whose readings are desired.  The search-specs can
   *  filter the results by specifying one or more statuses (separated
   *  by |).
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
   *  Note that the timestamp search-spec parameter and _count
   *  search-spec meta-parameters can be used in successive calls to
   *  allow scrolling through the collection of all readings for the
   *  specified sensor.
   *
   *  All user errors must be thrown as an array of AppError's.
   */
  async findSensorData(info) {
    const searchSpecs = validate('findSensorData', info);
    let tempcount = searchSpecs._count;
    delete searchSpecs._count;
    let doDetail;
    if(searchSpecs._doDetail)  {
      doDetail = searchSpecs._doDetail;
      delete searchSpecs._doDetail;
    }
    let retobj = {
      data: [], 
    };   
    let collection = this.db.collection('SensorDatas');
    let collectionoftypes = this.db.collection('SensorTypes');
    let collectionofsensors = this.db.collection('Sensors');

    let sensor = await collectionofsensors.findOne({id:searchSpecs.sensorId});
    let sensortype;
    if(sensor == undefined) {
      throw [ new AppError('X_ID', 'no sensor for given sensorId') ];
    }

    try {
      let res = await collection.find({sensorId:searchSpecs.sensorId}).sort({timestamp:-1}).toArray();
      sensortype = await collectionoftypes.findOne({id:sensor.model});
      
      /*breaker is just an escape so we don't go over _count*/
      let breaker = 0;
      for(let x of res) {
        if(searchSpecs.timestamp && x.timestamp > searchSpecs.timestamp) {
          continue;
        }
        const status = !inRange(x.value, sensortype.limits) ? 'error' : !inRange(x.value, sensor.expected) ? 'outOfRange' : 'ok';

        if(searchSpecs.statuses.has(status)) {
          if(breaker < tempcount) {
            retobj.data.push({
              timestamp: x.timestamp,
              value: x.value,
              status,
            });
            breaker++;
          }
          
        }
      }   
    }
    catch(err) {
      throw [ new AppError('X_ID', err) ];
    }finally{}

    if (doDetail) {
      retobj.sensorType = sensortype;
      retobj.sensor = sensor;  
    }

    return retobj;
  }



} //class Sensors

module.exports = Sensors.newSensors;

//Options for creating a mongo client
const MONGO_OPTIONS = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};


function inRange(value, range) {
  return Number(range.min) <= value && value <= Number(range.max);
}
