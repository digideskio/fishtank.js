/* ================================================================================================
 *
 *   fishtank.js (XDft)
 *   @version 1.1.1
 *
 *   A quick and dirty data management tool for storing and fetching data on the client side.
 *
 *   @author (⌐■_■) Geoff Daigle - twitter.com/dailydaigle
 *
 * ================================================================================================
 */


(function( window, undefined ) {

var


/* --- class vars --- */

/* Shortcuts to core javascript functions */
array_indexOf = Array.prototype.indexOf,
object_toString = Object.prototype.toString,
object_hasOwnProp = Object.prototype.hasOwnProperty,
string_trim = String.prototype.trim,

class_types = {},

comparison_types_english = ['greater than or equal', 'less than or equal', 'greater than', 'less than', 'not equal', 'equal'],
comparison_types = ['>=', '<=', '>', '<', '!=', '='],

implied_selector = '',

internal_storage = {},

selector_context = null,

prev_selector_context = null, // a string of all selector context stuffs

selector_parent = null, // a reference to the starter object after go_fish

deletion_selectors = [],

util = {},


/* --- main constructor object --- */

fishtank = function() {
	return util.go_fish.apply( this, arguments );
};


// for easier prototype modification
fishtank.fn = fishtank.prototype;


/* --- core functions --- */

/* the same as XDft() but it implies that the selector context is in use, usually by chaining */
fishtank.fn.find = function( $search_string ) {
	if ( typeof $search_string === 'undefined' ) {
		return null;
	}
	return util.go_fish( selector_context, $search_string );
};


/* shorthand for eq(0) or the first element */
fishtank.fn.first = function( ) {
	var sel_type = util.get_type( selector_context );
	if (sel_type === 'object' || sel_type === 'array') {
		util.for_each( selector_context, function(key, val){
			selector_context = val;
			return false;
		});
	} 
	return fishtank.fn;
};

/* shorthand for gettings index of object or array data like eq() */
fishtank.fn.row = function( $index ) {
	var sel_type = util.get_type( selector_context ),
		index = parseInt($index),
		counter = 0;
	if (sel_type === 'object' || sel_type === 'array') {
		util.for_each( selector_context, function(key, val){
			if (index === counter) {
				selector_context = val;
				return false;
			}
			counter++;
		});
	} 
	return fishtank.fn;
};


/* searches an array or an object for a selector, makes sure it checks out, then adds it to an object */
fishtank.fn.where = function( /* args */ ) {
	var args = arguments,
		args_length = args.length,
		where_object, where_selector, where_comparison,
		comparison_type = 'equal';

	deletion_selectors = [];

	if ( args_length === 0 ) {
		// do nothing
		return fishtank.fn;
	}

	// object
	if ( args_length === 1 ) {
		var where_type = util.get_type( args[0] );
		if ( where_type !== 'object' && where_type !== 'string' ) {
			throw new Error('fishtank.fn.where(): if supplying only one argument, the argument must be of type Object or of type String.');
		}

		if ( where_type === 'string' ) {
			where_object = util.parse_where_string( args[0] );
		} else {
			args[0].__comparison__ = 'equal';
			where_object = args[0];
		}
	}

	// key / value pair
	if ( args_length === 2 ) {
		var where_type1 = util.get_type( args[0] ),
			where_type2 = util.get_type( args[1] );
		if ( where_type1 !== 'string' || ( where_type2 !== 'string' && where_type2 !== 'number' && where_type2 !== 'boolean') ) {
			throw new Error('fishtank.fn.where(): if supplying two arguments, both arguments must be of type String (optional type is Boolean for second argument).');
		}
		where_object = {};
		where_object.__comparison__ = 'equal';
		where_object[ args[0] ] = args[1];
	}

	// do the comparison on context and return results
	selector_context = util.search_for_matches( where_object );
	return fishtank.fn;
};


/* same as .where() but instead of finding values, it replaces them with the selector/value pair */
fishtank.fn.update = function( /* args */ ) {
	var $args = arguments,
		args_length = $args.length,
		context_type = util.get_type( selector_context ),
		update_data = {},
		use_inner_objects = false;

	if ( args_length === 0 ) {
		// do nothing
		return fishtank.fn;
	}

	// assume an object of key/value pairs and update those
	if ( args_length === 1 ) {
		if ( util.get_type( $args[0] ) !== 'object'  ) {
			return fishtank.fn;
		}
		update_data = $args[0];
	}

	// either true and {}  or  string and string
	if ( args_length === 2 ) {
		var obj_type = util.get_type( $args[0] );
		if ( obj_type !== 'string' && obj_type !== 'boolean' ) {
			return fishtank.fn;
		}
		var obj_type2 = util.get_type( $args[1] );
		if ( (obj_type === 'string' && (obj_type2 === 'regexp' || obj_type2 === 'function') ) 
			|| (obj_type === 'boolean' && obj_type2 !== 'object') ) {
			return fishtank.fn;
		}

		if (obj_type === 'string'){
			update_data[ $args[0] ] = $args[1];
		} else {
			update_data = $args[1];
			use_inner_objects = $args[0];
		}
	}

	// update values after a search or in a similar fashion if we want
	if ( ( context_type === 'array' || context_type === 'object' ) && ( deletion_selectors.length !== 0 || use_inner_objects ) ) {
		util.for_each( selector_context, function( key, val ) {
			util.for_each( update_data, function( prop, data ) {
				if (typeof val[prop] !== 'undefined') {
					val[prop] = data;
				}
			})
		} );
	} else {
		util.for_each( update_data, function( prop, data ) {
			if (typeof selector_context[prop] !== 'undefined') {
				selector_context[prop] = data;
			}
		});
	}

	return fishtank.fn;
};


/* takes no arguments or a string/bool, and deletes the appropriate values from the object */
fishtank.fn.remove = function( /* args */ ) {
	var args = arguments,
	 	args_length = args.length,
	 	context_type = util.get_type( selector_context );

	if ( args_length === 0 ) {
		if ( ( context_type === 'array' || context_type === 'object' ) && deletion_selectors.length !== 0) {
			util.for_each( deletion_selectors, function( key, val ) {
				if ( prev_selector_context !== '') {
					selector_parent = util.object_rsearch( prev_selector_context.split('.'), selector_parent );
				}
				delete selector_parent[ val ];
				if ( util.get_type( selector_parent ) === 'array' ) {
					selector_parent.splice(val, 1);
				}
			} );

		} else {
			// value removal
			var selectors = prev_selector_context.split('.');
			if (prev_selector_context !== '') {
				var prop_name = selectors.pop();
				if ( prop_name.indexOf('eq(') === 0) {
					prop_name = parseInt( util.trim( prop_name.replace('eq(', '').replace(')', '') ) );
				}
				if (selectors.length !== 0) {
					selector_parent = util.object_rsearch( selectors, selector_parent );
				}
				delete selector_parent[ prop_name ];
				
			} 
		}
		return fishtank.fn;
	}

	// applies to a key only
	if ( args_length === 1 ) {
		var arg_type = util.get_type( args[0] );
		if ( arg_type !== 'boolean' && arg_type !== 'string' && arg_type !== 'number' ) {
			return fishtank.fn;
		}

		if (( context_type === 'array' || context_type === 'object' ) && deletion_selectors.length !== 0) {
			if ( prev_selector_context !== '') {
				selector_parent = util.object_rsearch( prev_selector_context.split('.'), selector_parent );
			}
			util.for_each( deletion_selectors, function( key, val ) {
				if ( val === args[0] ) {
					delete selector_parent[ val ];
					if ( util.get_type( selector_parent ) === 'array' ) {
						selector_parent.splice(val, 1);
					}
				}
			} );

		} else {
			if ( typeof selector_context[ args[0] ] !== 'undefined' ) {
				delete selector_context[ args[0] ];
			}
		}
		return fishtank.fn;
	}
};


/* returns the value of the current selector context as a copy to protect the data */
fishtank.fn.get = function() {
	var context_type = util.get_type( selector_context );

	if ( context_type === 'array' ) {
		return util.object_merge( true, [], selector_context );

	} else if ( context_type === 'object' )  {
		return util.object_merge( true, {}, selector_context );

	} else {
	 	return selector_context;
	}
};


/* If the selector context is an array, this returns either the first element or the element specified by the index  */
fishtank.fn.getRow = function( $index ) {
	var context_type = util.get_type( selector_context ),
		index = ( typeof $index !== 'undefined' )? parseInt($index) : 0;

	if ( context_type === 'array' ) {
		if ( typeof selector_context[ index ] !== 'undefined' ){
			var copy_obj = util.object_merge( true, [], selector_context );
			return copy_obj[ index ];
		} else {
			return null;
		}

	} else if ( context_type === 'object' )  {
		var returnable = null, counter = 0;
		util.for_each( selector_context, function (key, val) {
			if (counter === index) {
				var copy_obj = util.object_merge( true, {}, selector_context );
				returnable = copy_obj[ key ];
				return false;
			}
			counter++;
		});

		return returnable;

	} else {
	 	return fishtank.fn.get();
	}
};


/* adds a new key/value pair into the selector context if it is an object. */
fishtank.fn.insert = function() {
	var args = arguments,
		args_length = args.length,
		context_type = util.get_type( selector_context );


	if ( args_length === 0 || context_type !== 'object' ) {
		// do nothing
		return fishtank.fn;
	}

	// an object of properties
	if ( args_length === 1 ) {
		if ( util.get_type( args[0] ) !== 'object' ) {
			// do nothing
			return fishtank.fn;
		}

		util.object_merge( selector_context, args[0] );
		return fishtank.fn;
	}

	// a property and a value
	if ( args_length >= 2 ) {
		if ( typeof args[1]  === 'undefined' || util.get_type( args[0] ) !== 'string' ) {
			// do nothing
			return fishtank.fn;
		} 

		// NOTE: this applies a property of name of value args[0] - IT DOES NOT DO A SELECTOR MATCH
		// example --> if args[0] = 'val1.prop2.prop3', then selector_context[ 'val1.prop2.prop3' ] === args[1] 
		selector_context[ args[0] ] = args[1];
		return fishtank.fn;
	}
};


/* If the selector context is an array, this pushes a new value onto it with .push() . */
fishtank.fn.append = function( $value ) {
	var context_type = util.get_type( selector_context );
	if( context_type === 'array' ) {
		selector_context.push( $value );
	}
};


/* If the selector context is an array, this pushes a new value onto it with .unshift() . */
fishtank.fn.prepend = function( $value ) {
	var context_type = util.get_type( selector_context );
	if( context_type === 'array' ) {
		selector_context.unshift( $value );
	}
};




/* --- internal storage management --- */


/* selects an object within the internal_storage variable and returns it's pointer for other liraries to interact with this data */
fishtank.pointer = function( $selector_string ) {
	var selector_type = util.get_type( $selector_string );
	if ( selector_type !== 'string' ) {
		throw new Error('fishtank.pointer( $selector_string ): $selector_string must be of type String.');
	}
	$selector_string = util.trim( $selector_string );
	if ( $selector_string === '') {
		return internal_storage;
	}
	util.go_fish( internal_storage, $selector_string );
	return selector_context;
};


/* stores the selector string and appends it to each go_fish() search. */ 
/* This is an easy way to store multiple "databases" and switch between them */
fishtank.use = function( $selector_string ) {
	var selector_type = util.get_type( $selector_string );
	if ( selector_type !== 'string' ) {
		throw new Error('fishtank.use( $selector_string ): $selector_string must be of type String.');
	}
	implied_selector = $selector_string;
	return fishtank.fn;
};

/* shorthand for XDft().insert which is applied to the internal storage object */
fishtank.insert = function() {
	return util.go_fish().insert.apply( this, arguments );
};


/* --- utilities --- */

/* finds an object and stores it in selector_context */
util.go_fish = function( /* args */) {
	var args = arguments,
		args_length = args.length,
		search_object, search_context,
		object_type, object_type1, object_type2;

	deletion_selectors = [];

	// 0 args - use the internal storage object and move on
	if (args_length === 0) {
		selector_context = util.apply_implied_selector( internal_storage );
		prev_selector_context = implied_selector;
		selector_parent = internal_storage;
		return fishtank.fn;
	}

	// 1 arg - we have a selector or a context but not both
	if ( args_length === 1 ) {
		object_type = util.get_type( args[0] );

		// bad data
		if (object_type !== 'string' && object_type !== 'object' && object_type !== 'array') {
			selector_context = {};

		// selector
		} else if (object_type === 'string') {
			search_object = util.trim( args[0] );
			if ( search_object === '' ) {
				selector_context = {};
				prev_selector_context = '';
				selector_parent = {};
			} else {
				selector_context = util.object_rsearch( search_object.split('.'), util.apply_implied_selector( internal_storage ) );
				prev_selector_context = ((implied_selector !== '')? implied_selector + '.' : '') + search_object;
				selector_parent = internal_storage;
			}
			
		// context
		} else {
			selector_context = args[0];
			selector_parent = args[0];
			prev_selector_context = '';
		}

		return fishtank.fn;
	}

	// 2 args - might have both a context and a selector
	if ( args_length >= 2 ) {
		object_type1 = util.get_type( args[0] );
		object_type2 = util.get_type( args[1] );

		if (object_type1 !== 'object' && object_type1 !== 'array') {
			selector_context = {};
		} else {
			selector_context = args[0];
		}

		if (object_type2 !== 'string') {
			search_object = '';
		} else {
			search_object = util.trim( args[1] );
		}

		selector_parent = selector_context;

		if ( search_object === '' ) {
			selector_context = {};
		} else {
			selector_context = util.object_rsearch( search_object.split('.'), selector_context );
			prev_selector_context = search_object;
		}

		return fishtank.fn;
	}
};


/* searches for the implied selector on the object passes */
util.apply_implied_selector = function( $object ){
	if ( implied_selector === '' ) {
		return $object;
	}

	var selector_steps = implied_selector.split('.');
	return util.object_rsearch( selector_steps, $object );
};


/* takes a string from a where() call and determines the variable name, value, and if to use the inverse */
util.parse_where_string =  function( $string ){
	$string = util.trim( $string );
	var returnobj = null;
	util.for_each( comparison_types, function( key, val ){
		if ( $string.indexOf(val) !== -1 ) {
			var string_split = $string.split( val );
			returnobj = {
				__comparison__: comparison_types_english[ key ]
			};
			returnobj[ util.trim( string_split[0] ) ] = util.trim( string_split[1] );
			return false;
		}
	});
	return returnobj;
};


/**
    Takes a comparison object and finds matches within the selector context. Returns an array of matches.
 */
util.search_for_matches = function( $where ) {
	var results_obj = [],
		selector_context_type = util.get_type( selector_context ),
		comparison = String($where.__comparison__);
	
	delete $where.__comparison__;

	if (selector_context_type !== 'object' && selector_context_type !== 'array') {
		return [];
	}

	util.for_each( selector_context, function(key, val) {

		if ( util.matches_comparison( val, comparison, $where ) ) {
			results_obj.push( val );
			deletion_selectors.push( key );
		}
	} );

	return results_obj;
};


/**
    Runs through the object and makes comparisons. Only works if $obj is an array or an object
 */
util.matches_comparison = function ( $obj, $compare, $matchables ) {
	var matches = true,
		obj_type = util.get_type( $obj );

	if (obj_type !== 'object' && obj_type !== 'array') {
		return false;
	}

	util.for_each( $matchables, function(key, val) {
		if ( typeof $obj === 'undefined' ) {
			matches = false;
			return false;
		}
		matches = util.do_comparison( $obj[ key ], val, $compare );
		return matches; // stops loop if false;
	} );

	return matches;
};	



/**
   	Does the actual comparison for the above
 */
util.do_comparison = function ( $obj, $value, $match_type ) {
 	var obj_is_undefined = (typeof $obj === 'undefined' ),
 		obj_1 = String( $obj ).toLowerCase(),
 		obj_2 = String( $value ).toLowerCase();

 	// equality
 	switch ( $match_type ) {
 		case 'equal':
 			if (obj_is_undefined) return false;
 			return ( obj_1 === obj_2 );
 		case 'not equal':
 			if (obj_is_undefined) return true;
 			return ( obj_1 !== obj_2 );
 	}

 	// greater than / less than
 	// NOTE: because this converts strings into float types for the comparison, it is
 	//       suggested that only numbers and strings that represent numbers are compared.
 	if (obj_is_undefined) return false;
 	obj_1 = parseFloat( $obj ),
 	obj_2 = parseFloat( $value ); 

 	switch ( $match_type ){
 		case 'greater than or equal':
 			return obj_1 >= obj_2;
 		case 'less than or equal':
 			return obj_1 <= obj_2;
 		case 'greater than':
 			return obj_1 > obj_2;
 		case 'less than':
 			return obj_1 < obj_2;
 	}
};
 

/**
   	Recursive search for a particular object property in an object tree
 */
util.object_rsearch = function($obj_steps, $obj_pointer) {
	var local_obj_steps = $obj_steps.slice(0);
	if (local_obj_steps === undefined || $obj_pointer === undefined) {
		return null;
	}
	var next_path = util.trim(local_obj_steps.shift()),
		steps_left = local_obj_steps.length,
		obj_type = util.get_type($obj_pointer);
	if (util.get_type(next_path) !== 'string' || (obj_type !== 'object' && obj_type !== 'array')) {
		return null;
	}

	// check for existance of .eq(#)
	if (next_path.indexOf('eq(') === 0) {
		next_path = parseInt(next_path.replace(/eq\(|\)|\s/, ''));
		// get the array object index
		if ($obj_pointer[next_path] !== undefined) {
			if (steps_left === 0) {
				return $obj_pointer[next_path];
			} else {
				return util.object_rsearch(local_obj_steps, $obj_pointer[next_path]);
			}
		} else {
			return null;
		}

	// we may have a length attribute as opposed to a actual var called "length"
	} else if (next_path == 'length' && steps_left === 0) {
		if (typeof $obj_pointer.length !== 'undefined'){
			return $obj_pointer.length;
		}

	// unfortnately, if we are pointing to an array and the "eq()" or "length" isn't present, we cant progress so we're done
	} else if (obj_type === 'array') {
		return null;
	}


	// if everything validates, we check for the existence of the property and return the proper data
	if (next_path in $obj_pointer) {
		if (steps_left === 0) {
			return $obj_pointer[next_path];
		} else {
			return util.object_rsearch(local_obj_steps, $obj_pointer[next_path]);
		}
	} else {
		return null;
	}
};


/**
   	Gets any object's length in terms of iterating over it
 */
util.get_length = function(obj) {
	var size = 0, key, type  = util.get_type(obj);
	if (type === 'array') return obj.length;
	if (type !== 'object') return 1;
	for (key in obj) {
	    if (obj.hasOwnProperty(key)) size++;
	}
	return size;
};


/**
   	Returns an array of properties to be iterated over
 */
util.get_loopable_props = function(obj) {
	var props = [], type  = util.get_type(obj);

	for (key in obj) {
		if (type === 'object'){
		    if (obj.hasOwnProperty(key)) props.push(obj[key]);
		} else if (type !== 'array') {
			props.push(obj);
			break;
		} else {
			props.push(obj[key]);
		}
	}
	return props;
};


/**
   	Does a regex search in a string and return true if that string is found in the haystack
 */
util.in_string = function( $haystack, $needle ) {
	$needle = (util.get_type($needle) === 'regexp')? $needle : new RegExp($needle, 'i');
	return $haystack.match($needle) !== null;
};


/**
	Removes the whitespace from the beginning and end of a string.
	Uses Native trim function if possible
 */
util.trim = string_trim && !string_trim.call("\uFEFF\xA0") ?
	function( $text ) {
		return $text == null ?
			"" :
			string_trim.call( $text );
	} :

	// if no core trim, use our own trimming functionality
	function( $text ) {
		return $text == null ?
			"" :
			( $text + "" ).replace( reg_trim, "" );
	};


/**
   	Boolean function to see if an object is an array.
 */
util.is_array = Array.isArray || function ( $obj ) {
	return (util.get_type( $obj ) === "array");
};


/**
   	Boolean function to see if an object is a function.
 */
util.is_function = function( $obj ) {
	return util.get_type( $obj ) === "function";
};


/**
   	Checks to see if target is a "plain" object (taken from jQuery's is_plain_object() function)
 */
util.is_plain_object = function( $obj ) {
	// Must be an $object.
	// Because of IE, we also have to check the presence of the constructor property.
	// Make sure that DOM nodes and window $objects don't pass through, as well
	if ( !$obj || util.get_type($obj) !== "$object" || $obj.nodeType || util.is_window( $obj ) ) {
		return false;
	}

	try {
		// Not own constructor property must be $object
		if ( $obj.constructor &&
			!object_hasOwnProp.call($obj, "constructor") &&
			!object_hasOwnProp.call($obj.constructor.prototype, "isPrototypeOf") ) {
			return false;
		}
	} catch ( e ) {
		// IE8,9 Will throw exceptions on certain host $objects #9897
		return false;
	}

	// Own properties are enumerated firstly, so to speed up,
	// if last one is own, then all properties are own.
	var key;
	for ( key in $obj ) {}

	return key === undefined || object_hasOwnProp.call( $obj, key );
};


/**
   	Checks to see if target is the window object (taken from jQuery's is_window() function)
 */
util.is_window = function( $obj ) {
	return  $obj != null &&  $obj ==  $obj.window;
};


/**
   	Returns a string of the given object's type
 */
util.get_type = function ( $obj ) {
	return ($obj === null)? 
			String($obj) 
			: ( class_types[ object_toString.call($obj) ] || "object" );
};


/**
   	Returns the index of an object in an array, or -1 (taken from jQuery's inArray() function)
 */
util.in_array = function( elem, arr, i ) {
	var len;

	if ( arr ) {
		if ( array_indexOf ) {
			return array_indexOf.call( arr, elem, i );
		}

		len = arr.length;
		i = i ? i < 0 ? Math.max( 0, len + i ) : i : 0;

		for ( ; i < len; i++ ) {
			// Skip accessing in sparse arrays
			if ( i in arr && arr[ i ] === elem ) {
				return i;
			}
		}
	}

	return -1;
};


/**
   	Used exclusively to clean up array indexes. (Taken from jQuery's grep() function)
 */
util.grep = function( elems, callback, inv ) {
	var retVal,
		ret = [],
		i = 0,
		length = elems.length;
	inv = !!inv;

	// Go through the array, only saving the items
	// that pass the validator function
	for ( ; i < length; i++ ) {
		retVal = !!callback( elems[ i ], i );
		if ( inv !== retVal ) {
			ret.push( elems[ i ] );
		}
	}

	return ret;
};


/**
   	Loop through the properties of an object or elements of an array and apply
   	a callback to each. (Taken from jQuery's each() function)
 */
util.for_each = function( $obj, $callback, $args ) {
	var name,
		i = 0,
		length = $obj.length,
		isObj = length === undefined || util.is_function( $obj );

	/* 
		Loop over object properties and kill loop if any callback returns false
	*/

	// if $args is passed, we pass that to each callback function
	if ( $args ) {
		if ( isObj ) {
			for ( name in $obj ) {
				if ( $callback.apply( $obj[ name ], $args ) === false ) {
					break;
				}
			}
		} else {
			// NOTE: loop only once if not actually an object
			for ( ; i < length; ) { 
				if ( $callback.apply( $obj[ i++ ], $args ) === false ) {
					break;
				}
			}
		}

	// For the more common utilization, we fire this loop
	} else {
		if ( isObj ) {
			for ( name in $obj ) {
				if ( $callback.call( $obj[ name ], name, $obj[ name ] ) === false ) {
					break;
				}
			}
		} else {
			for ( ; i < length; ) {
				if ( $callback.call( $obj[ i ], i, $obj[ i++ ] ) === false ) {
					break;
				}
			}
		}
	}

	return $obj;
};


/**	
   	Takes two or more objects/arrays and merges their properties together 
   	(Taken from jQuery's extend() function)
 */
util.object_merge = function() {
	var options, name, src, copy, copyis_array, clone,
			target = arguments[0] || {},
			i = 1,
			length = arguments.length,
			deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !util.is_function(target) ) {
		target = {};
	}

	for ( ; i < length; i++ ) {
		// Only deal with non-null/undefined values
		if ( (options = arguments[ i ]) != null ) {
			// Extend the base object
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				// Prevent never-ending loop
				if ( target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( util.is_plain_object(copy) || (copyis_array = util.is_function(copy)) ) ) {
					if ( copyis_array ) {
						copyis_array = false;
						clone = src && util.is_array(src) ? src : [];

					} else {
						clone = src && util.is_plain_object(src) ? src : {};
					}

					// Never move original objects, clone them
					target[ name ] = util.object_merge( deep, clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};




//---------------------------------------------------------------------------------------------
// expose fishtank
//---------------------------------------------------------------------------------------------

// push data into the class_types object
util.for_each("Boolean Number String Function Array Date RegExp Object".split(" "), function($i, $name) {
	class_types[ "[object " + $name + "]" ] = $name.toLowerCase();
});

window.XDft = fishtank;

})( window )


/* end of fishtank */
