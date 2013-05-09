
/* ================================================================================================
 *
 *   fishtank.js (XDft)
 *   @version 1.0.2
 *
 *   The way client-side data management should be.
 *
 *   @author Geoff Daigle
 *
 * ================================================================================================
 */


(function( window, undefined ) {
	var
		// All of the data will go here
		mainStorageContainer = {},

		// When using the class, the selected data is saved in the context cache for chaining
		dataContext = {},

		// if you want to always select from a certain part of the data, add a value here
		startSelector = '',

		// Kepps track of the state of the data and if it is synced with the backend
		// 0 - unsynced
		// 1 - synced
		// 2 - sync in progress
		syncStatus = 1,

		// Changes to 0 if there is an ajax connection error, otherwise, defaults to 1.
		connectionStatus = 1,

		// the app object
		fishtank = function() {
			return fishtank.fn.init();
		};

		// Fishtank syncs all data with the browser's local storage for offline use if supported.
		// This toggle allows a user to shut off this feature.
		useLocalStorage = true, 

		// simple test to check for localstorage availablility
		detectLocalStorage = function() {
			var storage,
			    fail,
			    uid;
			try {
				uid = new Date;
				(storage = window.localStorage).setItem(uid, uid);
				fail = storage.getItem(uid) != uid;
				storage.removeItem(uid);
				fail && (storage = false);
			} catch(e) {
				fail = true;
			}

			return !fail;
		},
		// store that value found above
		localStorageAvaialble = detectLocalStorage(),

		// Sync and fetch data from local storage 
		syncLocalStorage = function () {
			if (useLocalStorage) {
				// We only bother syncing main storage because most people will use that
				window.localStorage['XDfishtank_appdata'] = JSON.stringify(mainStorageContainer);
			}
			return true;
		},
		fetchLocalStorage = function() {
			if (window.localStorage.XDfishtank_appdata !== undefined){
				var data = window.localStorage.XDfishtank_appdata;

				// [borrowed from jquery's parseJSON]
				// (skips sanitizing because we know what we are trying to parse)
				// --

				// Attempt to parse using the native JSON parser first
				if ( window.JSON && window.JSON.parse ) {
					return window.JSON.parse( data );
				}

				// Make sure the incoming data is actual JSON
				if ( rvalidchars.test( data.replace( rvalidescape, "@" )
					.replace( rvalidtokens, "]" )
					.replace( rvalidbraces, "")) ) {

					return ( new Function( "return " + data ) )();
				}

				// --

				console.error('Fishtank error: fetchLocalStorage: data being parsed is not in JSON format');
			} else {
				return {};
			}
		},

		// an object clone function
		// http://stackoverflow.com/questions/3774008/cloning-a-javascript-object
		clone = (function(){ 
		  return function (obj) { Clone.prototype=obj; return new Clone() };
		  function Clone(){}
		}());


	// -------------------------------------------------
	// initialization and selection
	// -------------------------------------------------

	fishproto = fishtank.fn = fishtank.prototype = {
		constructor: fishtank,
		init: function( selector, context ) {
			// for construction 
			if(selector === true && context === undefined) {
				return this;
			}

			// We can search for data within a context object as opposed to using
			// the fishtank main storage object - This allows us to use fishtank
			// as a utility and not necessarily as a database tool.
			var contextObject = context || mainStorageContainer,
				selectorParts, currentPart, doBuild = {},
				selections, partsLen, selLen, i = 0, j = 0,
				selPointer, selPointerName, arraySearch, arrayIndex,
				selectFound, startSel = ""+startSelector+"",
				datalen = 0, prop, resArray = [], p = 0, aLen;

			// only apply the start selector out of main storage context
			if (context !== undefined) {
				startSel = '';
			}

			// can only take strings as a selector
			if (typeof selector !== 'string' && selector !== undefined) {
				console.error('Fishtank error: fishtank( selector, [context] ): "selector" must be of type String');
			}
			
			// use the context selector as a selector string if no selector is defined
			if(selector === undefined && startSelector !== '') {
				selector = ""+startSel.substr(0, startSel.length -1)+"";
				startSel = '';
			// return main storage if there isn't a selector or context selector
			} else if (selector === undefined && startSelector == '') {
				doBuild = mainStorageContainer;
				dataContext = doBuild;
				return this;
			}

			// Mostly for find(), we want to be able to search into a dataset's context without redefining 
			// the selector we just looked in. for example, i want to do:
			//   XDft('cars').find('corvette');
			// as opposed to
			//   XDft('cars').find('cars.corvette');  
			if (context !== undefined) {
			    for(prop in contextObject) {
			    	if(contextObject.hasOwnProperty(prop)){
				    	datalen++;
				    	startSel = prop+'.';
				    }
			    }
			    if (datalen !== 1){
					startSel =  '';
				}
			}
			
	
			// trim and check for multiple selections
			selections = (selector).replace(/\s/g, '').split(',');
			selLen = selections.length;

			for (; i < selLen; i++ ) {
				selectFound = true;
				selectorParts = (startSel+selections[i]).split('.');
				partsLen = selectorParts.length;
				selPointer = contextObject;

				// loop through the parts and search for matching properties
				for (j = 0; j < partsLen; j++ ) {
	
					// trim
					currentPart = selectorParts[j].replace(/\s/g, '');

					// check for array selector
					arraySearch = currentPart.search( /\[[0-9]{1,10000}\]$|\[\a\l\l\]$/ );
					if ( arraySearch !== -1) {
						//prep
						resArray = [];

						// get the pointer name
						selPointerName = currentPart.substr(0, arraySearch);

						// get the index
						arrayIndex = currentPart.substr(arraySearch, currentPart.length).replace(/\[|\]/g, '');

						// this gets funky when we do where().find() ... so we need to check if the context is an array
						// I KNOW THIS IS COPYPASTA AND CRAP BUT I'LL FIX IT LATER
						if (selPointer.constructor === Array) {
							var sPointLen = selPointer.length
							// iterate over the array to get to the next level object
							for (var r = 0; r < sPointLen; r++) {
								var pointObj = selPointer[r][selPointerName];

								if (pointObj !== undefined && pointObj.constructor === Array ) {
									// pass all of the results into one big array
									if (arrayIndex === 'all'){
										aLen = pointObj.length;
										for (p=0; p < aLen; p++) {
											resArray.push(pointObj[ p ]);
										}

									// otherwise, grab the array index and push it to the array
									} else {
										arrayIndex = parseInt(arrayIndex);
										if (pointObj[ arrayIndex ] !== undefined) {
											resArray.push(pointObj[ arrayIndex ]);
										} else {
											selectFound = false;
											break;
										}	
									}
								} else {
									selectFound = false;
									break;
								}
							}

							// pass the results array as the pointer
							if (resArray.length > 0){
								selPointer = resArray;
							} else {
								selectFound = false;
								break;
							}

						} else {
							if (selPointer[ selPointerName ] !== undefined && selPointer[ selPointerName ].constructor === Array ) {
								// pass all of the results into one big array
								if (arrayIndex === 'all'){
									
									aLen = selPointer[ selPointerName ].length;
									for (; p < aLen; p++) {
										resArray.push(selPointer[ selPointerName ][ p ]);
									}
									// pass the results array as the pointer
									if (resArray.length > 0){
										selPointer = resArray;
									} else {
										selectFound = false;
										break;
									}
								// otherwise, grab the array index as the new context
								} else {
									arrayIndex = parseInt(arrayIndex);
									if (selPointer[ selPointerName ][ arrayIndex ] !== undefined) {
										selPointer = selPointer[ selPointerName ][ arrayIndex ];
									} else {
										selectFound = false;
										break;
									}	
								}
								
							} else {
								selectFound = false;
								break;
							}	
						}						

					// else, check if context is an object and if the property exists
					} else if (typeof selPointer === 'object') {
						// if we are searching within the array, we'll need to look through the whole thing
						// this can get pretty hairy
						if (selPointer.constructor === Array) {
							resArray = [];
							aLen = selPointer.length;
							for (; p < aLen; p++) {
								if (selPointer[ p ][ currentPart ] !== undefined) {
									resArray.push(selPointer[ p ][ currentPart ]);
								}
							}
							// pass the results array as the pointer
							if (resArray.length > 0){
								selPointer = resArray;
								selPointerName = currentPart;
							} else {
								selectFound = false;
								break;
							}

						// otherwise, we have a regular object
						} else {
							if ( selPointer[ currentPart ] !== undefined ) {
								// move forward one step
								selPointer = selPointer[ currentPart ];
								selPointerName = currentPart;
							} else {
								// couldn't find it;
								selectFound = false;
								break;
							}
						}
					}
				}
				// push the context pointer into the object
				if (selectFound) {
					doBuild[ selPointerName ] = selPointer;
				}
			}

			// add the final object into the dataContext var
			dataContext = doBuild;

			// return fishtank for chaining
			return this;
	    },

	    // the way a user can select data
		gofish: function( selector, context ) {
			return fishtank.fn.init(selector, context);
		},

		// as a safety, this copys an object and returns it
		makeCopy: function( obj ){
			var cloneobj = clone(obj);
			if (cloneobj.__proto__){
				return cloneobj.__proto__;
			} else if(cloneobj.prototype) {
				return cloneobj.prototype;
			} else {
				return cloneobj;
			}
		},

	    // Number of returned results. The default is 0
	    length: 0,

	    // The number of elements contained in the matched element set (alternative to XDft().length)
		size: function() {
			return this.length;
		},

		// return the context object
		// make a clone so that the only way to update is by explictally calling update()
		get: function($nocopy) {
			var nocopy = $nocopy || false;
			if (nocopy){
				return dataContext;
			} else {
				return this.makeCopy(dataContext);
			}
		},

		// return dataContext.prop[0] if first dataContext.prop is an array, otherwise, return the context
		getRow: function($nocopy) {
			var nocopy = $nocopy || false;
			for (var o in dataContext) {
				if (dataContext[o].constructor === Array) {
					if (dataContext[o][0] !== undefined) {
						if (nocopy){
							return dataContext[o][0];
						} else {
							return this.makeCopy(dataContext[o][0]);
						}
					} else {
						return null;
					}
				} else {		
					if (nocopy){
						return dataContext;
					} else {
						return this.makeCopy(dataContext);
					}
				}
				break;
			}
		},

		// get the context value if only one item is selected 
		getValue: function($nocopy) {
			var nocopy = $nocopy || false;
			var datalen = 0, prop, prop2, copyobj;
		    for(prop2 in dataContext) {
		    	if(dataContext.hasOwnProperty(prop2)){
			    	datalen++;
			    }
		    }
			if (datalen === 1) {
				for (prop in dataContext) {
					if (nocopy){
						copyobj = dataContext;
					} else {
						copyobj = this.makeCopy(dataContext);
					}
					if (copyobj[ prop ]) {
						return copyobj[ prop ];
					} else if (copyobj.prototype[ prop ]) {
						copyobj.prototype[ prop ]
					} else {
						return {};
					}
				}
			}
		}
	};

	// Give the init function the fishtank prototype for later instantiation
	fishtank.fn.init.prototype = fishtank.fn;

	// fishtank extend (for plugins)
	// TODO: actually check what's being added as an extension and deal with it accordingly
	fishtank.extend = fishtank.fn.extend = function() {
		var target = fishtank.fn,
			i = 0, name, copy, options,
			length = arguments.length;

		// change the target to the passed target
		// if we have more than one argument
		if (length > 1){
			target = arguments[0];
			i++;
		}

		// apply extensions
		for ( ; i < length; i++ ) {
			if ( (options = arguments[ i ]) != null ) {
				for ( name in options ) {
					copy = options[ name ];
					if ( copy !== undefined ){
						target[ name ] = copy;
					}
				}
			}
		}

		// return modified target (usually 'this' (aka fishtank));
		return target;
	};

	// Use our XDft.extend() feature above to add the rest of the fishtank functions
	fishtank.extend({

		// use a selector string to filter data within context
		find: function( selector ) { 
			return fishproto.gofish( selector, dataContext );
		},

		// filter the selected context using key/value comparisons and place result into the dataContext
		where: function( compareObj, mergename ) {
			var prop, cont, i,
				newContext = [], newContextWrap = {}, 
				curVal, curContext, curObj, contextLen,
				regextest, regpattern, objItem;

			// because the data context has multiple data groups, loop them
			for (cont in dataContext) {
				newContext = [];
				curContext = dataContext[ cont ];
				// where() only applies to arrays so anything else doesnt count
				if (curContext.constructor === Array) {
					contextLen = curContext.length;
					// iterate through the objects in the context array
					for (i = 0; i < contextLen; i++) {
						curObj = curContext[i];

						// not going to bother with arrays inside arrays
						if (curObj.constructor === Array) {
							continue;
						}

						// loop through comparison objects
						for (prop in compareObj){

							// we want to cross-compare string and integer values
							// so we convert them all to strings
							if (typeof compareObj[ prop ] !== 'boolean'){
								curVal = ""+compareObj[ prop ]+"";
							}

							// we don't care about the property name.
							// here we'll do a simple string compare.
							// this ONLY WORKS when the dataContext.prop is an array of strings.
							if (prop === '_value_') {
								if (typeof curObj !== 'object' && typeof curObj !== 'boolean') {
									// convert curobj to string
									curObj = ""+curObj.toLowerCase()+"";
									regpattern = new RegExp('^'+curVal.replace(/\%/g, '(.*?)')+"$", 'i');
									regextest = regpattern.test( curObj );
									if (regextest) {
										// found a match, push to the array
										newContext.push(curObj);
									}
								}

							// on the other hand, sometimes we do care about the property names
							} else {
								// only works when curObj is an object and not an array
								if (typeof curObj === 'object' && curObj.constructor !== Array) {
									if (curObj [ prop ] !== undefined) {
										if (typeof compareObj[ prop ] !== 'boolean'){
											objItem = (""+curObj[ prop ]+"").toLowerCase();
											regpattern = new RegExp('^'+curVal.replace(/\%/g, '(.*?)')+"$", 'i');
											regextest = regpattern.test( objItem );
											if (regextest) {
												// found a match, push to the array
												newContext.push(curObj);
											}
										} else {
											if (objItem === curVal) {
												newContext.push(curObj);
											}
										}
									}
								}
							}
						}
					}
					// add the property to the new data object
					newContextWrap[ cont ] = newContext;
				}
			}

			// push new data to the dataContext object
			dataContext = newContextWrap;

			if (mergename !== undefined && typeof mergename === 'string') {
				fishproto.merge(mergename);
			}

			return fishproto;
		},

		// update data nodes
		update: function( updateObj, nosync ) {
			// catch invalid update objects
			if (updateObj === undefined || typeof updateObj !== 'object') {
				console.error('Fishtank error: XDft.fn.update( updateObj ): "updateObj" must be an object');
				return false;
			}

			var prop, curupdate, o, curlen, im, nosync = nosync || false;

			// we could have multiple contexts (organized by property name) in here 
			// ...so we have to loop through them
			for (o in dataContext) {
				curupdate = dataContext[o];

				for (prop in updateObj) {
					// data objects can't be functions, fail silently
					if (typeof updateObj[prop] === 'function') {
						continue;
					}

					// update the data

					// curupdate is an array of objects
					if (curupdate.constructor === Array) {
						curlen = curupdate.length;
						for (i = 0; i < curlen; i++) {
							// update all objects with that property
							if (curupdate[i][ prop ] !== undefined) {
								curupdate[i][ prop ] = updateObj[prop] ;
								if (curupdate[i]._mod_ !== undefined && !nosync) {
									curupdate[i]._mod_ = new Date().getTime();
									syncStatus = 0;
								}
							}
						}

					// curupdate is an object with properties
					} else {
						// simply make the update on it's matching property
						if (curupdate[ prop ] !== undefined) {
							curupdate[ prop ] = updateObj[prop];
							if (curupdate._mod_ !== undefined && !nosync) {
								curupdate._mod_ = new Date().getTime();
								syncStatus = 0;
							}
						}
					}
				}
			}

			syncLocalStorage();

			// enable chaining
			return fishproto;
		},

		// delete a data node
		delete: function( propName ) {
			// TODO
			// but generally, I never delete data. I just do {deleted: 1}
			// I'll get to this later.
			syncLocalStorage();
			return fishproto;
		},


		// insert a data node
		insert:function( propName, dataObj ) {
			// catch invalid prop name
			if (propName === undefined || (typeof propName !== 'string' && typeof propName !== 'object')) {
				console.error('Fishtank error: XDft.fn.insert( propName, [dataObj] ): "propName" is invalid');
				return false;
			}
			// data objects can't be functions
			if (typeof dataObj === 'function') {
				console.error('Fishtank error: XDft.fn.insert( propName, [dataObj] ): "dataObj" cannot be a function');
				return false;
			}

			// default to an empty string if the object is not specified
			var insertdata = dataObj || '';

			if (typeof propName === 'object'){
				if (dataContext.constructor === Array){
					dataContext.push(propName);
				} else {
					dataContext = fishproto.getValue(true);
					if (dataContext.constructor === Array){
						dataContext.push(propName);
					}
				}
			} else {
				// insert data
				dataContext[ propName ] = dataObj;

				// place new data into the context
				dataContext = dataContext[ propName ];
			}

			syncLocalStorage();

			// enable chaining
			return fishproto;
		},

		// if the dataContext is a collection of array results, join them into one array
		merge: function( namecontext ){
			// catch invalid name
			if (typeof namecontext !== 'string') {
				console.error('Fishtank error: XDft.fn.merge( namecontext ): "namecontext" must be a string');
				return false;
			}

			var o, newContext = {}, newContextArray = [],
				arrLen, i;

			// loop and merge arrays
			for (o in dataContext) {
				if (dataContext[o].constructor === Array) {
					arrLen = dataContext[o].length;
					for (i = 0; i < arrLen; i++) {
						newContextArray.push(dataContext[o][i]);
					}
				}
			}

			// push new context with new name
			newContext[namecontext] = newContextArray;
			dataContext = newContext;

			return fishproto;
		},

		// points the data context to the first array element in itself.
		// if the data context is not an array, it first calls getValue
		first: function() {
			if (dataContext.constructor === Array){
				dataContext = dataContext[0];
			} else {
				dataContext = fishproto.getValue(true);
				// we could make this recursive but we'd only want one loop anyway
				if (dataContext.constructor === Array){
					dataContext = dataContext[0];
				} 
			}
			return fishproto;
		},

		// toggle localstorage
		useLocalStorage: function (toggle) {
			if (typeof toggle !== 'boolean') {
				return false;
			}

			useLocalStorage = toggle;
			return true;
		},

		// wipe main storage and overwrite with new data
		overwriteMainStorage: function ( dataobj ) {
			if (typeof dataobj !== 'object') {
				return false;
			}

			// clear
			mainStorageContainer = {};
			// push data
			mainStorageContainer = dataobj;
			return true;
		},

		// use what's stored locally and add it to the mainStorageContainer
		buildLocalStorage: function () {
			if (useLocalStorage) {
				mainStorageContainer = {};
				mainStorageContainer = fetchLocalStorage();
			}
			return true;
		},

		// use a context for all data queries
		selectorContext: function ( selector ) {
			if (typeof selector !== 'string') {
				return false;
			}

			// clear
			startSelector = selector+'.';

			return fishproto;
		}
	});


	// functions that don't use XDft()... 
	// you can call them with XDft.function()
	fishtank.extend( fishtank.fn.gofish, {
		// shortcut for inserting data to the root database
		insert: function( propName, dataObj ) {
			return fishproto.gofish().insert( propName, dataObj );
		},
		
		// easy way to give the database variable to other applications
		dbPointer: function(selector) {
			if (mainStorageContainer[selector] !== undefined) {
				window.XDft_db_pointer = mainStorageContainer[selector];
				return window.XDft_db_pointer;
			}
			return false;
		},

		// so plugin developers can get the data context
		currentDataPointer: dataContext,

		// also, developers can access inner functions to modify the data context
		// example: XDft.proto.getValue() -> value of current dataContext
		proto: fishproto
	});


	//---------------------------------------------------------------------------------------------
	// expose fishtank
	window.fishtankApp = new fishtank();
	window.fishtank = window.XDft = window.fishtankApp.gofish;

})( window );
