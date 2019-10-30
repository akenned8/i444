const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');

const AppError = require('./app-error');

const OK = 200;
const CREATED = 201;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const CONFLICT = 409;
const SERVER_ERROR = 500;

function serve(port, sensors) {
  //@TODO set up express app, routing and listen
  const app = express();
  app.locals.port = port;
  app.locals.sensors = sensors;
  setupRoutes(app);
  app.listen(port, function() {
  	console.log(`listening on port ${port}`);
  });

}

module.exports = {
  serve: serve
}

function setupRoutes(app) {
	const sensors = app.locals.sensors;
	app.use(cors());
  	app.use(bodyParser.json());
  	app.get('/sensor-types', doGetSensorTypes(app));
  	app.get('/sensors', doGetSensors(app));
  	app.get('/sensor-types/:id', doGetSensorTypesID(app));
  	app.get('/sensors/:id', doGetSensorsID(app));
  	app.post('/sensor-types', doCreateSensorType(app));
  	app.post('/sensors', doCreateSensor(app));
  	app.get('/sensor-data/:id/:timestamp', doGetSensorDataIDTimestamp(app));
  	app.get('/sensor-data/:id', doGetSensorDataID(app));	
  	app.post('/sensor-data/:id', doCreateSensorData(app));
  	app.use(doErrors()); //must be last
}

//.originalURL?
//app('host') or app.get('host')

//@TODO routing function, handlers, utility functions

function doCreateSensorData(app) {
  return errorWrap(async function(req, res) {
    try {
      const obj = req.body;
      obj.sensorId = req.params.id;
      const results = await app.locals.sensors.addSensorData(obj);
      res.append('Location', requestUrl(req) + '/' + obj.timestamp);
      res.sendStatus(CREATED);
    }
    catch(err) {
      const mapped = mapError(err);
      res.status(mapped.status);
      const errorResults = {};
      const errorArr = [{code: mapped.code , message: mapped.message}]; 
      errorResults.errors = errorArr;
      res.json(errorResults);
    }
  });
}

function doGetSensorDataIDTimestamp(app) {
  return errorWrap(async function(req, res) {
    try {
    	const q = {};
       q.sensorId = req.params.id;
       q.timestamp = req.params.timestamp;
      const results = await app.locals.sensors.findSensorData(q);
      results.data.splice(1,results.data.length);
      
      if(results.data[0].timestamp != q.timestamp) {
      	const err = `no data for timestamp ${q.timestamp}`;
      	const mapped = mapError([ new AppError('NOT_FOUND', err) ]);
        res.status(mapped.status);
        const errorResults = {};
        const errorArr = [{code: mapped.code , message: mapped.message}]; 
        errorResults.errors = errorArr;
        res.json(errorResults);
        return;
      }
      
      if (results.length === 0) {
		throw {
		  isDomain: true,
		  errorCode: 'NOT_FOUND',
		  message: `user ${id} not found`,
		};
      }
      else {
      	results.self = requestUrl(req);
      	for(let i = 0; i < results.data.length; i++) {
      		results.data[i].self = requestUrl(req);
      	}
		res.json(results);
      }
    }
    catch(err) {
      const mapped = mapError(err);
      res.status(mapped.status);
      const errorResults = {};
      const errorArr = [{code: mapped.code , message: mapped.message}]; 
      errorResults.errors = errorArr;
      res.json(errorResults);
    }
  });
}

function doGetSensorDataID(app) {
  return errorWrap(async function(req, res) {
    try {
      const q = req.query || {};
      //const sensorId = req.params.id;
      q.sensorId = req.params.id;
      const results = await app.locals.sensors.findSensorData(q);
      if (results.length === 0) {
		throw {
		  isDomain: true,
		  errorCode: 'NOT_FOUND',
		  message: `error message here`,
		};
      }
      else {
      	results.self = requestUrl(req);
      	for(let i = 0; i < results.data.length; i++) {
      		results.data[i].self = "http://localhost:2345/sensor-data/" + q.sensorId + "/" + results.data[i].timestamp;
      	}
		res.json(results);
      }
    }
    catch(err) {
      const mapped = mapError(err);
      res.status(mapped.status);
      const errorResults = {};
      const errorArr = [{code: mapped.code , message: mapped.message}]; 
      errorResults.errors = errorArr;
      res.json(errorResults);
    }
  });
}

function doCreateSensorType(app) {
  return errorWrap(async function(req, res) {
    try {
      const obj = req.body;
      const results = await app.locals.sensors.addSensorType(obj);
      res.append('Location', requestUrl(req) + '/' + obj.id);
      res.sendStatus(CREATED);
    }
    catch(err) {
      const mapped = mapError(err);
      res.status(mapped.status);
      const errorResults = {};
      const errorArr = [{code: mapped.code , message: mapped.message}]; 
      errorResults.errors = errorArr;
      res.json(errorResults);
    }
  });
}
function doCreateSensor(app) {
  return errorWrap(async function(req, res) {
    try {
      const obj = req.body;
      const results = await app.locals.sensors.addSensor(obj);
      res.append('Location', requestUrl(req) + '/' + obj.id);
      res.sendStatus(CREATED);
    }
    catch(err) {
      const mapped = mapError(err);
      res.status(mapped.status);
      const errorResults = {};
      const errorArr = [{code: mapped.code , message: mapped.message}]; 
      errorResults.errors = errorArr;
      res.json(errorResults);
    }
  });
}


function doGetSensorTypes(app) {
  return errorWrap(async function(req, res) {
    const q = req.query || {};
    try {
      const results = await app.locals.sensors.findSensorTypes(q);
      results.self = requestUrl(req);
      
      //next
      if(results.nextIndex != -1) {
      	results.next = changeIndexInURL(results.nextIndex , requestUrl(req));
      }
      //prev
      if(results.previousIndex != 0 && results.previousIndex != -1) {
      	results.prev = changeIndexInURL(results.previousIndex , requestUrl(req));
      }
      
      for(let i=0; i < results.data.length; i++) {
      	results.data[i].self = "http://localhost:2345/sensor-types/" + results.data[i].id; 
      }

      res.json(results);
    }
    catch (err) {
      const mapped = mapError(err);
      res.status(mapped.status);
      const errorResults = {};
      const errorArr = [{code: mapped.code , message: mapped.message}]; 
      errorResults.errors = errorArr;
      res.json(errorResults);
    }
  });
}
function doGetSensors(app) {
  return errorWrap(async function(req, res) {
    const q = req.query || {};
    try {
      const results = await app.locals.sensors.findSensors(q);

      //next
      if(results.nextIndex != -1) {
      	results.next = changeIndexInURL(results.nextIndex , requestUrl(req));
      }
      //prev
      if(results.previousIndex != 0 && results.previousIndex != -1) {
      	results.prev = changeIndexInURL(results.previousIndex , requestUrl(req));
      }
      
      results.self = requestUrl(req);
      for(let i=0; i < results.data.length; i++) {
      	results.data[i].self = "http://localhost:2345/sensors/" + results.data[i].id; 
      }

      res.json(results);
    }
    catch (err) {
      const mapped = mapError(err);
      res.status(mapped.status);
      const errorResults = {};
      const errorArr = [{code: mapped.code , message: mapped.message}]; 
      errorResults.errors = errorArr;
      res.json(errorResults);
    }
  });
}

function doGetSensorTypesID(app) {
  return errorWrap(async function(req, res) {
    try {
      const id = req.params.id;
      const results = await app.locals.sensors.findSensorTypes({ id: id });
      if (results.length === 0) {
		throw {
		  isDomain: true,
		  errorCode: 'NOT_FOUND',
		  message: `user ${id} not found`,
		};
      }
      else {
      	results.self = requestUrl(req);
      	results.data[0].self = requestUrl(req);
		res.json(results);
      }
    }
    catch(err) {
      const mapped = mapError(err);
      res.status(mapped.status);
      const errorResults = {};
      const errorArr = [{code: mapped.code , message: mapped.message}]; 
      errorResults.errors = errorArr;
      res.json(errorResults);
    }
  });
}
function doGetSensorsID(app) {
  return errorWrap(async function(req, res) {
    try {
      const id = req.params.id;
      const results = await app.locals.sensors.findSensors({ id: id });
      if (results.length === 0) {
	throw {
	  isDomain: true,
	  errorCode: 'NOT_FOUND',
	  message: `user ${id} not found`,
	};
      }
      else {
      	results.self = requestUrl(req);
      	results.data[0].self = requestUrl(req);
		res.json(results);
      }
    }
    catch(err) {
      const mapped = mapError(err);
      res.status(mapped.status);
      const errorResults = {};
      const errorArr = [{code: mapped.code , message: mapped.message}]; 
      errorResults.errors = errorArr;
      res.json(errorResults);
    }
  });
}





/** Ensures a server error results in nice JSON sent back to client
 *  with details logged on console.
 */ 
function doErrors(app) {
  return async function(err, req, res, next) {
    res.status(SERVER_ERROR);
    res.json({ code: 'SERVER_ERROR', message: err.message });
    console.error(err);
  };
}
/** Set up error handling for handler by wrapping it in a 
 *  try-catch with chaining to error handler on error.
 */
function errorWrap(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    }
    catch (err) {
      next(err);
    }
  };
}

const ERROR_MAP = {
  EXISTS: CONFLICT,
  NOT_FOUND: NOT_FOUND
}

function mapError(err) {
  console.error(err);
  let error = err.toString();
  errarr = error.split(":")
  const errobj = { status: (ERROR_MAP[errarr[0]] || BAD_REQUEST),
					code: errarr[0],
					message: errarr[1]
      			  };
  return errobj;
} 

/** Return original URL for req */
function requestUrl(req) {
  const port = req.app.locals.port;
  return `${req.protocol}://${req.hostname}:${port}${req.originalUrl}`;
}

/*Get next link*/

function changeIndexInURL(nextIndex , url) {
  let nexturl = '';
  let spliturl = url.split('?');
  //if I need to go in and change index becuase there are other params specified.
  if(spliturl.length > 1) {
    let parameters = spliturl[1].split('&');
    for(let i = 0; i < parameters.length; i++) {
      if(parameters[i].includes("_index")) {
        let y = parameters[i].slice(0,-1) + nextIndex;
        parameters[i] = y;
        break;
      }
      else if(i == parameters.length-1) {
      	parameters.push('_index=' + nextIndex);
      }   
    }
    nexturl = url.split('?')[0]+ '?' + parameters.join('&');
  }
  //if no additional params specified in original request just add index to end of url
  else {
    nexturl = url + "?_index=" + nextIndex;
  }
  return nexturl;
}

