'use strict';

const assert = require('assert');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const querystring = require('querystring');

const Mustache = require('./mustache');
const mustache = new Mustache();
const widgetView = require('./widget-view');

const STATIC_DIR = 'statics';
// const TEMPLATES_DIR = '~/git-repos/i444/submit/prj4-sol';
const TEMPLATES_DIR = 'templates';

function serve(port, model, base='') {
  const app = express();
  app.locals.port = port;
  app.locals.base = base;
  app.locals.model = model;
  process.chdir(__dirname);
  app.use(base, express.static(STATIC_DIR));
  setupTemplates(app);
  setupRoutes(app);
  app.listen(port, function() {
    console.log(`listening on port ${port}`);
  });
  
}


module.exports = serve;

/*************** Routes ****************/

function setupRoutes(app) {
  const base = app.locals.base;
  app.get(`${base}/sensor-types.html`, doSearch(app));
  
  app.get(`${base}/sensors.html`, doSearchSensor(app));
  
  app.get(`${base}/sensor-types/add.html`, createSensorTypeForm(app));
  app.post(`${base}/sensor-types/add.html`, bodyParser.urlencoded({extended: true}), createUpdateSensorType(app));

  app.get(`${base}/sensors/add.html`, createSensorForm(app));
  app.post(`${base}/sensors/add.html`, bodyParser.urlencoded({extended: true}), createUpdateSensor(app));
}


/************************** Field Definitions **************************/

const SENSORTYPE_FIELDS_INFO = [
  {
    name: 'id',
    label: 'Sensor Type ID',
    classes: ['tst-sensor-type-id'],
    regex: /^[\w\-\_]+$/,
    value: 'sensortypeid_value',
    error: 'Sensor Type Id field can only contain alphanumerics, -, or _',
  },
  {
    name: 'modelNumber',
    label: 'Model Number',
    classes: ['tst-model-number'],
    regex: /^[\w\-\'\ ]+$/,
    value: 'modelnumber_value',
    error: 'Model Number field can only contain alphanumerics, -, apostrophe, or space',
  },
  {
    name: 'manufacturer',
    label: "Manufacturer",
    classes: ['tst-manufacturer'],
    regex: /^[a-zA-Z\-\'\ ]+$/,
    value: 'manufacturer_value',
    error: 'Manufacturer can only contain alphabetics, -, apostrophe, or space',
  },
  {
  	type: 'select',
    name: 'quantity',
    label: 'Measure',
    choices: {
	'': 'Select',
	pressure: 'Pressure',
	temperature: 'Temperature',
	flow: 'Flow',
	humidity: 'Humidity',
      },
    classes: ['tst-quantity'],
    regex: /^[a-zA-Z\-\'\ ]+$/,
    error: 'Model Number field can only contain alphabetics, -, apostrophe, or space',
  },
  {
  	name: 'limits',
	label: 'Limits',
	classes: ['numeric interval'],
	type: 'interval',
	regex: /[0-9]+/,
	error: 'Limits must be numbers only'
  }
];

const SENSOR_FIELDS_INFO = [
  {
    name: 'id',
    label: 'Sensor ID',
    classes: ['tst-sensor-id'],
    regex: /^[\w\-\_]+$/,
    value: 'sensor_id_value',
    error: 'Sensor Type Id field can only contain alphanumerics, -, or _',
  },
  {
    name: 'model',
    label: 'Model',
    classes: ['tst-model'],
    regex: /^[\w\-\_]+$/,
    value: 'sensor_model_value',
    error: 'Model field can only contain alphanumerics, -, or _',
  },
  {
    name: 'period',
    label: 'Period',
    classes: ['tst-period'],
    regex: /^[0-9]+$/,
    value: 'period_value',
    error: 'Period field can only contain integers',
  },
  {
  	name: 'expected',
	label: 'Expected',
	classes: ['numeric interval'],
	type: 'interval',
	regex: /[0-9]+/,
	error: 'Limits must be numbers only'
  }
];

const SENSORTYPE_FIELDS =
  Object.keys(SENSORTYPE_FIELDS_INFO).map((n) => Object.assign({name: n}, SENSORTYPE_FIELDS_INFO[n]));
const SENSOR_FIELDS =
  Object.keys(SENSOR_FIELDS_INFO).map((n) => Object.assign({name: n}, SENSOR_FIELDS_INFO[n]));


/************ Action Routines *****************/

function createUpdateSensorType(app) {
	return async function(req,res) {
		req.body.unit = ".";
		let requires  = ['id', 'modelNumber', 'manufacturer', 'quantity', 'limits'];
		let errors = validate(req.body, requires, SENSORTYPE_FIELDS_INFO, 'update');

		/*if there's no errors we enter the block*/
		if(!errors || Object.keys(errors).length === 0) {
			try {
				let created = await app.locals.model.update('sensor-types', req.body);
				res.redirect('/sensor-types.html?id='+req.body.id);
			}
			catch(err) {
				console.log(err.errors[0].message); 
			}

		}
		/*Either validation failed OR we got some web service error*/
		if (errors && Object.keys(errors).length !== 0) {
	      	const view = helpCreateSensorType(req.body);

	      	for(let i = 0; i < view.widgets.length; i++) {
	      		if(errors[view.widgets[i].name]) {
	      			view.widgets[i].error = errors[view.widgets[i].name];
	      		}	
	      	}
	      	const html = mustache.render('addTemplate', view);
	      	res.send(html);
	    }
	}
}

function helpCreateSensorType(q) {
	let widgets = [];
    let view = {searchType: 'Sensor Type', isType: true, widgets}; //for sensor search replace true with false 
  	let createFields = SENSORTYPE_FIELDS_INFO;
  	
  	
  	for (const widget of createFields) {
  		widget.label += "*";
    	const viewpart = widgetView(widget, q ? {value: q[widget.name]} : {value: ""}, widget.errors);
    	view.widgets.push(viewpart);
    	widget.label = widget.label.substring(0,widget.label.length-1);
  	}

	return view;
}

function createSensorTypeForm(app) {
	return async function(req,res) {
		let view = helpCreateSensorType();
		let html = mustache.render('addTemplate', view);
	  	res.send(html);
	}
}


function doSearch(app) {
  return async function(req, res) {
  	//*use validate function*//
    let q = getNonEmptyValues(req.query);
    let requires = []; //stays as an empty array, strictly for validate() purposes
    let errors = {};
    /*if theres a nonempty query*/
    if(Object.keys(q).length !== 0) {
    	errors = validate(req.query, requires, SENSORTYPE_FIELDS_INFO, 'search');
    }
    let search = {};
    let webErrorMessage = "";

    if (!errors || Object.keys(errors).length === 0) { 
      try {
		search = await app.locals.model.list('sensor-types',q);
      }
      
      catch (err) {
		webErrorMessage = (err.errors[0].message);
		if(webErrorMessage.substring(0,5) === "no re") {
      		webErrorMessage = "No results";
      	}
      }
    }   

    let widgets = [];
    let view = {searchType: 'Sensor Type', isType: true, widgets, search, wsError: webErrorMessage}; //for sensor search replace true with false 
  	let html = "";
  	for (const widget of SENSORTYPE_FIELDS_INFO) {
  		if(widget.name !== 'limits') {
  			const viewpart = widgetView(widget, {value: req.query[widget.name]}, widget.errors);
    		view.widgets.push(viewpart);
  		}
  	}
  	for(let i = 0; i < view.widgets.length; i++) {
  		if(errors[view.widgets[i].name]) {
  			view.widgets[i].error = errors[view.widgets[i].name];
  		}	
  	}
  	
  	if(view.search.next) {
  		q._index = view.search.nextIndex;
  		let tempparams = new URLSearchParams(q).toString();
  		view.search.nextQuery = "?" + tempparams;
  	}
  	if(view.search.prev) {
  		q._index = view.search.previousIndex;
  		let tempparams = new URLSearchParams(q).toString();
  		view.search.prevQuery = "?" + tempparams;
  	}

	html += mustache.render('searchTemplate', view);
  	res.send(html);
  };
};

function doSearchSensor(app) {
  return async function(req, res) {
  	//*use validate function*//
    let q = getNonEmptyValues(req.query);
    let requires = []; //stays as an empty array, strictly for validate() purposes
    let errors = {};
    /*if theres a nonempty query*/
    if(Object.keys(q).length !== 0) {
    	errors = validate(req.query, requires, SENSOR_FIELDS_INFO, 'search');
    }
    let search = {};
    let webErrorMessage = "";

    if (!errors || Object.keys(errors).length === 0) { 
      try {
		search = await app.locals.model.list('sensors',q);
      } 
      catch (err) {
      	webErrorMessage = err.errors[0].message;
      	if(webErrorMessage.substring(0,5) === "no re") {
      		webErrorMessage = "No results";
      	}
      }
    }   

    let widgets = [];
    let view = {searchType: 'Sensors ', isType: false, widgets, search, wsError: webErrorMessage}; //for sensor search replace true with false 
  	let html = "";
  	for (const widget of SENSOR_FIELDS_INFO) {
  		if(widget.name !== 'expected') {
  			const viewpart = widgetView(widget, {value: req.query[widget.name]}, widget.errors);
    		view.widgets.push(viewpart);
  		}
  	}
  	for(let i = 0; i < view.widgets.length; i++) {
  		if(errors[view.widgets[i].name]) {
  			view.widgets[i].error = errors[view.widgets[i].name];
  		}	
  	}
  	
  	if(view.search.next) {
  		q._index = view.search.nextIndex;
  		let tempparams = new URLSearchParams(q).toString();
  		view.search.nextQuery = "?" + tempparams;
  	}
  	if(view.search.prev) {
  		q._index = view.search.previousIndex;
  		let tempparams = new URLSearchParams(q).toString();
  		view.search.prevQuery = "?" + tempparams;
  	}

	html += mustache.render('searchTemplate', view);
  	res.send(html);
  };
};

function createUpdateSensor(app) {
	return async function(req,res) {
		req.body.unit = ".";
		let requires  = ['id', 'model', 'period', 'expected'];
		let errors = validate(req.body, requires, SENSOR_FIELDS_INFO, 'update');
		let webErrorMessage = "";
		/*if there's no errors we enter the block*/
		if(!errors || Object.keys(errors).length === 0) {	
			try {
				let created = await app.locals.model.update('sensors', req.body);
				res.redirect('/sensors.html?id='+req.body.id);
			}
			catch(err) {
				webErrorMessage = (err.errors[0].message); 
				const view = helpCreateSensor(req.body);
	      		view.wsError = webErrorMessage;
	      		const html = mustache.render('addTemplate', view);
	      		res.send(html);
			}

		}
		/*Either validation failed OR we got some web service error*/
		if (errors && Object.keys(errors).length !== 0) {
	      	const view = helpCreateSensor(req.body);

	      	for(let i = 0; i < view.widgets.length; i++) {
	      		if(errors[view.widgets[i].name]) {
	      			view.widgets[i].error = errors[view.widgets[i].name];
	      		}	
	      	}
	      	const html = mustache.render('addTemplate', view);
	      	res.send(html);
	    }
	}
}

function helpCreateSensor(q) {
	let widgets = [];
    let view = {searchType: 'Sensors', isType: false, widgets}; //for sensor search replace true with false 
  	let createFields = SENSOR_FIELDS_INFO;
  	
  	
  	for (const widget of createFields) {
  		widget.label += "*";
    	const viewpart = widgetView(widget, q ? {value: q[widget.name]} : {value: ""}, widget.errors);
    	view.widgets.push(viewpart);
    	widget.label = widget.label.substring(0,widget.label.length-1);
  	}

	return view;
}

function createSensorForm(app) {
	return async function(req,res) {
		let view = helpCreateSensor();
		let html = mustache.render('addTemplate', view);
	  	res.send(html);
	}
}




/*************** auxillary **************/
/** Return copy of FIELDS with values and errors injected into it. */
function fieldsWithValues(values, errors={}, FIELDS) {
  return FIELDS.map(function (info) {
    const name = info.name;
    const extraInfo = { value: values[name] };
    if (errors[name]) extraInfo.errorMessage = errors[name];
    return Object.assign(extraInfo, info);
  });
}

/** Given map of field values and requires containing list of required
 *  fields, validate values.  Return errors hash or falsy if no errors.
 
 FIELDS_INFO will be SENSORTYPE_FIELDS_INFO, etc. 
 validateType will be either 'search' or 'update' 
 */
function validate(values, requires=[], FIELDS_INFO, validateType) {
  const errors = {};
  
  /*if we are validating a create/update form then all fields must have values*/
  if (validateType === "update") {
  	requires.forEach(function (key) {
    if (values[key] === undefined || values[key] === "") {
	      errors[key] =
		`A value for '${key}' must be provided`;
	   }
  	});
  }
  
  /*this matches regexes to all of the fields regardless of validateType*/
  for(let widget of FIELDS_INFO) {
  	const value = values[widget.name];
  	/*if this is not a limits widget*/
  	if(widget.name !== "limits" && widget.name !== "expected") {
  		if (widget.regex && value /*!== ""*/ && !value.match(widget.regex)) {
	      errors[widget.name] = widget.error;
	    }
  	}
  	/*if it is a limits widget*/
  	else {
  		if(validateType === "search") {
  			return errors;
  		}
  		if (!values[widget.name].min || !values[widget.name].max) {
  			errors[widget.name] = 'Both a Max and a Min must be specified';
  		}
  		else {
  			let minvalue = parseInt(values[widget.name].min, 10);
	  		let maxvalue = parseInt(values[widget.name].max, 10);

	  	    if (minvalue > maxvalue) {	
	  			errors[widget.name] = 'The Limits Min value is greater than its Max value';
	  		}
	  		minvalue = minvalue.toString();
	  		maxvalue = maxvalue.toString();
	  		if (widget.regex && (!minvalue.match(widget.regex)) || (!maxvalue.match(widget.regex))) {
		      errors[widget.name] = widget.error;
		    }
	  		
	  		
  		}
  	}  	
  }
  return errors;
  
}

function getNonEmptyValues(obj) {
	for(let name in obj) {
		if(!obj[name]) {
			delete obj[name];
		}	
	}
	return obj;
}

/** Return a model suitable for mixing into a template */
function errorModel(app, values={}, errors={}, FIELDS) {
  return {
    base: app.locals.base,
    errors: errors._,
    fields: fieldsWithValues(values, errors, FIELDS)
  };
}

/************************ General Utilities ****************************/

/** Decode an error thrown by web services into an errors hash
 *  with a _ key.
 */
function wsErrors(err) {
  const msg = (err.message) ? err.message : 'web service error';
  console.error(msg);
  return { _: [ msg ] };
}

function doMustache(app, templateId, view) {
  const templates = { footer: app.templates.footer };
  return mustache.render(app.templates[templateId], view, templates);
}

function errorPage(app, errors, res) {
  if (!Array.isArray(errors)) errors = [ errors ];
  const html = doMustache(app, 'errors', { errors: errors });
  res.send(html);
}

function isNonEmpty(v) {
  return (v !== undefined) && v.trim().length > 0;
}

function setupTemplates(app) {
  app.templates = {};
  for (let fname of fs.readdirSync(TEMPLATES_DIR)) {
    const m = fname.match(/^([\w\-]+)\.ms$/);
    if (!m) continue;
    try {
      app.templates[m[1]] =
	String(fs.readFileSync(`${TEMPLATES_DIR}/${fname}`));
    }
    catch (e) {
      console.error(`cannot read ${fname}: ${e}`);
      process.exit(1);
    }
  }
}

