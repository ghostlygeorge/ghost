/*!
 * QUnit 1.18.0
 * http://qunitjs.com/
 *
 * Copyright jQuery Foundation and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: 2015-04-03T10:23Z
 */

(function( window ) {

var QUnit,
	config,
	onErrorFnPrev,
	loggingCallbacks = {},
	fileName = ( sourceFromStacktrace( 0 ) || "" ).replace( /(:\d+)+\)?/, "" ).replace( /.+\//, "" ),
	toString = Object.prototype.toString,
	hasOwn = Object.prototype.hasOwnProperty,
	// Keep a local reference to Date (GH-283)
	Date = window.Date,
	now = Date.now || function() {
		return new Date().getTime();
	},
	globalStartCalled = false,
	runStarted = false,
	setTimeout = window.setTimeout,
	clearTimeout = window.clearTimeout,
	defined = {
		document: window.document !== undefined,
		setTimeout: window.setTimeout !== undefined,
		sessionStorage: (function() {
			var x = "qunit-test-string";
			try {
				sessionStorage.setItem( x, x );
				sessionStorage.removeItem( x );
				return true;
			} catch ( e ) {
				return false;
			}
		}())
	},
	/**
	 * Provides a normalized error string, correcting an issue
	 * with IE 7 (and prior) where Error.prototype.toString is
	 * not properly implemented
	 *
	 * Based on http://es5.github.com/#x15.11.4.4
	 *
	 * @param {String|Error} error
	 * @return {String} error message
	 */
	errorString = function( error ) {
		var name, message,
			errorString = error.toString();
		if ( errorString.substring( 0, 7 ) === "[object" ) {
			name = error.name ? error.name.toString() : "Error";
			message = error.message ? error.message.toString() : "";
			if ( name && message ) {
				return name + ": " + message;
			} else if ( name ) {
				return name;
			} else if ( message ) {
				return message;
			} else {
				return "Error";
			}
		} else {
			return errorString;
		}
	},
	/**
	 * Makes a clone of an object using only Array or Object as base,
	 * and copies over the own enumerable properties.
	 *
	 * @param {Object} obj
	 * @return {Object} New object with only the own properties (recursively).
	 */
	objectValues = function( obj ) {
		var key, val,
			vals = QUnit.is( "array", obj ) ? [] : {};
		for ( key in obj ) {
			if ( hasOwn.call( obj, key ) ) {
				val = obj[ key ];
				vals[ key ] = val === Object( val ) ? objectValues( val ) : val;
			}
		}
		return vals;
	};

QUnit = {};

/**
 * Config object: Maintain internal state
 * Later exposed as QUnit.config
 * `config` initialized at top of scope
 */
config = {
	// The queue of tests to run
	queue: [],

	// block until document ready
	blocking: true,

	// by default, run previously failed tests first
	// very useful in combination with "Hide passed tests" checked
	reorder: true,

	// by default, modify document.title when suite is done
	altertitle: true,

	// by default, scroll to top of the page when suite is done
	scrolltop: true,

	// when enabled, all tests must call expect()
	requireExpects: false,

	// depth up-to which object will be dumped
	maxDepth: 5,

	// add checkboxes that are persisted in the query-string
	// when enabled, the id is set to `true` as a `QUnit.config` property
	urlConfig: [
		{
			id: "hidepassed",
			label: "Hide passed tests",
			tooltip: "Only show tests and assertions that fail. Stored as query-strings."
		},
		{
			id: "noglobals",
			label: "Check for Globals",
			tooltip: "Enabling this will test if any test introduces new properties on the " +
				"`window` object. Stored as query-strings."
		},
		{
			id: "notrycatch",
			label: "No try-catch",
			tooltip: "Enabling this will run tests outside of a try-catch block. Makes debugging " +
				"exceptions in IE reasonable. Stored as query-strings."
		}
	],

	// Set of all modules.
	modules: [],

	// The first unnamed module
	currentModule: {
		name: "",
		tests: []
	},

	callbacks: {}
};

// Push a loose unnamed module to the modules collection
config.modules.push( config.currentModule );

// Initialize more QUnit.config and QUnit.urlParams
(function() {
	var i, current,
		location = window.location || { search: "", protocol: "file:" },
		params = location.search.slice( 1 ).split( "&" ),
		length = params.length,
		urlParams = {};

	if ( params[ 0 ] ) {
		for ( i = 0; i < length; i++ ) {
			current = params[ i ].split( "=" );
			current[ 0 ] = decodeURIComponent( current[ 0 ] );

			// allow just a key to turn on a flag, e.g., test.html?noglobals
			current[ 1 ] = current[ 1 ] ? decodeURIComponent( current[ 1 ] ) : true;
			if ( urlParams[ current[ 0 ] ] ) {
				urlParams[ current[ 0 ] ] = [].concat( urlParams[ current[ 0 ] ], current[ 1 ] );
			} else {
				urlParams[ current[ 0 ] ] = current[ 1 ];
			}
		}
	}

	if ( urlParams.filter === true ) {
		delete urlParams.filter;
	}

	QUnit.urlParams = urlParams;

	// String search anywhere in moduleName+testName
	config.filter = urlParams.filter;

	if ( urlParams.maxDepth ) {
		config.maxDepth = parseInt( urlParams.maxDepth, 10 ) === -1 ?
			Number.POSITIVE_INFINITY :
			urlParams.maxDepth;
	}

	config.testId = [];
	if ( urlParams.testId ) {

		// Ensure that urlParams.testId is an array
		urlParams.testId = decodeURIComponent( urlParams.testId ).split( "," );
		for ( i = 0; i < urlParams.testId.length; i++ ) {
			config.testId.push( urlParams.testId[ i ] );
		}
	}

	// Figure out if we're running the tests from a server or not
	QUnit.isLocal = location.protocol === "file:";

	// Expose the current QUnit version
	QUnit.version = "1.18.0";
}());

// Root QUnit object.
// `QUnit` initialized at top of scope
extend( QUnit, {

	// call on start of module test to prepend name to all tests
	module: function( name, testEnvironment ) {
		var currentModule = {
			name: name,
			testEnvironment: testEnvironment,
			tests: []
		};

		// DEPRECATED: handles setup/teardown functions,
		// beforeEach and afterEach should be used instead
		if ( testEnvironment && testEnvironment.setup ) {
			testEnvironment.beforeEach = testEnvironment.setup;
			delete testEnvironment.setup;
		}
		if ( testEnvironment && testEnvironment.teardown ) {
			testEnvironment.afterEach = testEnvironment.teardown;
			delete testEnvironment.teardown;
		}

		config.modules.push( currentModule );
		config.currentModule = currentModule;
	},

	// DEPRECATED: QUnit.asyncTest() will be removed in QUnit 2.0.
	asyncTest: function( testName, expected, callback ) {
		if ( arguments.length === 2 ) {
			callback = expected;
			expected = null;
		}

		QUnit.test( testName, expected, callback, true );
	},

	test: function( testName, expected, callback, async ) {
		var test;

		if ( arguments.length === 2 ) {
			callback = expected;
			expected = null;
		}

		test = new Test({
			testName: testName,
			expected: expected,
			async: async,
			callback: callback
		});

		test.queue();
	},

	skip: function( testName ) {
		var test = new Test({
			testName: testName,
			skip: true
		});

		test.queue();
	},

	// DEPRECATED: The functionality of QUnit.start() will be altered in QUnit 2.0.
	// In QUnit 2.0, invoking it will ONLY affect the `QUnit.config.autostart` blocking behavior.
	start: function( count ) {
		var globalStartAlreadyCalled = globalStartCalled;

		if ( !config.current ) {
			globalStartCalled = true;

			if ( runStarted ) {
				throw new Error( "Called start() outside of a test context while already started" );
			} else if ( globalStartAlreadyCalled || count > 1 ) {
				throw new Error( "Called start() outside of a test context too many times" );
			} else if ( config.autostart ) {
				throw new Error( "Called start() outside of a test context when " +
					"QUnit.config.autostart was true" );
			} else if ( !config.pageLoaded ) {

				// The page isn't completely loaded yet, so bail out and let `QUnit.load` handle it
				config.autostart = true;
				return;
			}
		} else {

			// If a test is running, adjust its semaphore
			config.current.semaphore -= count || 1;

			// Don't start until equal number of stop-calls
			if ( config.current.semaphore > 0 ) {
				return;
			}

			// throw an Error if start is called more often than stop
			if ( config.current.semaphore < 0 ) {
				config.current.semaphore = 0;

				QUnit.pushFailure(
					"Called start() while already started (test's semaphore was 0 already)",
					sourceFromStacktrace( 2 )
				);
				return;
			}
		}

		resumeProcessing();
	},

	// DEPRECATED: QUnit.stop() will be removed in QUnit 2.0.
	stop: function( count ) {

		// If there isn't a test running, don't allow QUnit.stop() to be called
		if ( !config.current ) {
			throw new Error( "Called stop() outside of a test context" );
		}

		// If a test is running, adjust its semaphore
		config.current.semaphore += count || 1;

		pauseProcessing();
	},

	config: config,

	// Safe object type checking
	is: function( type, obj ) {
		return QUnit.objectType( obj ) === type;
	},

	objectType: function( obj ) {
		if ( typeof obj === "undefined" ) {
			return "undefined";
		}

		// Consider: typeof null === object
		if ( obj === null ) {
			return "null";
		}

		var match = toString.call( obj ).match( /^\[object\s(.*)\]$/ ),
			type = match && match[ 1 ] || "";

		switch ( type ) {
			case "Number":
				if ( isNaN( obj ) ) {
					return "nan";
				}
				return "number";
			case "String":
			case "Boolean":
			case "Array":
			case "Date":
			case "RegExp":
			case "Function":
				return type.toLowerCase();
		}
		if ( typeof obj === "object" ) {
			return "object";
		}
		return undefined;
	},

	extend: extend,

	load: function() {
		config.pageLoaded = true;

		// Initialize the configuration options
		extend( config, {
			stats: { all: 0, bad: 0 },
			moduleStats: { all: 0, bad: 0 },
			started: 0,
			updateRate: 1000,
			autostart: true,
			filter: ""
		}, true );

		config.blocking = false;

		if ( config.autostart ) {
			resumeProcessing();
		}
	}
});

// Register logging callbacks
(function() {
	var i, l, key,
		callbacks = [ "begin", "done", "log", "testStart", "testDone",
			"moduleStart", "moduleDone" ];

	function registerLoggingCallback( key ) {
		var loggingCallback = function( callback ) {
			if ( QUnit.objectType( callback ) !== "function" ) {
				throw new Error(
					"QUnit logging methods require a callback function as their first parameters."
				);
			}

			config.callbacks[ key ].push( callback );
		};

		// DEPRECATED: This will be removed on QUnit 2.0.0+
		// Stores the registered functions allowing restoring
		// at verifyLoggingCallbacks() if modified
		loggingCallbacks[ key ] = loggingCallback;

		return loggingCallback;
	}

	for ( i = 0, l = callbacks.length; i < l; i++ ) {
		key = callbacks[ i ];

		// Initialize key collection of logging callback
		if ( QUnit.objectType( config.callbacks[ key ] ) === "undefined" ) {
			config.callbacks[ key ] = [];
		}

		QUnit[ key ] = registerLoggingCallback( key );
	}
})();

// `onErrorFnPrev` initialized at top of scope
// Preserve other handlers
onErrorFnPrev = window.onerror;

// Cover uncaught exceptions
// Returning true will suppress the default browser handler,
// returning false will let it run.
window.onerror = function( error, filePath, linerNr ) {
	var ret = false;
	if ( onErrorFnPrev ) {
		ret = onErrorFnPrev( error, filePath, linerNr );
	}

	// Treat return value as window.onerror itself does,
	// Only do our handling if not suppressed.
	if ( ret !== true ) {
		if ( QUnit.config.current ) {
			if ( QUnit.config.current.ignoreGlobalErrors ) {
				return true;
			}
			QUnit.pushFailure( error, filePath + ":" + linerNr );
		} else {
			QUnit.test( "global failure", extend(function() {
				QUnit.pushFailure( error, filePath + ":" + linerNr );
			}, { validTest: true } ) );
		}
		return false;
	}

	return ret;
};

function done() {
	var runtime, passed;

	config.autorun = true;

	// Log the last module results
	if ( config.previousModule ) {
		runLoggingCallbacks( "moduleDone", {
			name: config.previousModule.name,
			tests: config.previousModule.tests,
			failed: config.moduleStats.bad,
			passed: config.moduleStats.all - config.moduleStats.bad,
			total: config.moduleStats.all,
			runtime: now() - config.moduleStats.started
		});
	}
	delete config.previousModule;

	runtime = now() - config.started;
	passed = config.stats.all - config.stats.bad;

	runLoggingCallbacks( "done", {
		failed: config.stats.bad,
		passed: passed,
		total: config.stats.all,
		runtime: runtime
	});
}

// Doesn't support IE6 to IE9, it will return undefined on these browsers
// See also https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error/Stack
function extractStacktrace( e, offset ) {
	offset = offset === undefined ? 4 : offset;

	var stack, include, i;

	if ( e.stack ) {
		stack = e.stack.split( "\n" );
		if ( /^error$/i.test( stack[ 0 ] ) ) {
			stack.shift();
		}
		if ( fileName ) {
			include = [];
			for ( i = offset; i < stack.length; i++ ) {
				if ( stack[ i ].indexOf( fileName ) !== -1 ) {
					break;
				}
				include.push( stack[ i ] );
			}
			if ( include.length ) {
				return include.join( "\n" );
			}
		}
		return stack[ offset ];

	// Support: Safari <=6 only
	} else if ( e.sourceURL ) {

		// exclude useless self-reference for generated Error objects
		if ( /qunit.js$/.test( e.sourceURL ) ) {
			return;
		}

		// for actual exceptions, this is useful
		return e.sourceURL + ":" + e.line;
	}
}

function sourceFromStacktrace( offset ) {
	var error = new Error();

	// Support: Safari <=7 only, IE <=10 - 11 only
	// Not all browsers generate the `stack` property for `new Error()`, see also #636
	if ( !error.stack ) {
		try {
			throw error;
		} catch ( err ) {
			error = err;
		}
	}

	return extractStacktrace( error, offset );
}

function synchronize( callback, last ) {
	if ( QUnit.objectType( callback ) === "array" ) {
		while ( callback.length ) {
			synchronize( callback.shift() );
		}
		return;
	}
	config.queue.push( callback );

	if ( config.autorun && !config.blocking ) {
		process( last );
	}
}

function process( last ) {
	function next() {
		process( last );
	}
	var start = now();
	config.depth = ( config.depth || 0 ) + 1;

	while ( config.queue.length && !config.blocking ) {
		if ( !defined.setTimeout || config.updateRate <= 0 ||
				( ( now() - start ) < config.updateRate ) ) {
			if ( config.current ) {

				// Reset async tracking for each phase of the Test lifecycle
				config.current.usedAsync = false;
			}
			config.queue.shift()();
		} else {
			setTimeout( next, 13 );
			break;
		}
	}
	config.depth--;
	if ( last && !config.blocking && !config.queue.length && config.depth === 0 ) {
		done();
	}
}

function begin() {
	var i, l,
		modulesLog = [];

	// If the test run hasn't officially begun yet
	if ( !config.started ) {

		// Record the time of the test run's beginning
		config.started = now();

		verifyLoggingCallbacks();

		// Delete the loose unnamed module if unused.
		if ( config.modules[ 0 ].name === "" && config.modules[ 0 ].tests.length === 0 ) {
			config.modules.shift();
		}

		// Avoid unnecessary information by not logging modules' test environments
		for ( i = 0, l = config.modules.length; i < l; i++ ) {
			modulesLog.push({
				name: config.modules[ i ].name,
				tests: config.modules[ i ].tests
			});
		}

		// The test run is officially beginning now
		runLoggingCallbacks( "begin", {
			totalTests: Test.count,
			modules: modulesLog
		});
	}

	config.blocking = false;
	process( true );
}

function resumeProcessing() {
	runStarted = true;

	// A slight delay to allow this iteration of the event loop to finish (more assertions, etc.)
	if ( defined.setTimeout ) {
		setTimeout(function() {
			if ( config.current && config.current.semaphore > 0 ) {
				return;
			}
			if ( config.timeout ) {
				clearTimeout( config.timeout );
			}

			begin();
		}, 13 );
	} else {
		begin();
	}
}

function pauseProcessing() {
	config.blocking = true;

	if ( config.testTimeout && defined.setTimeout ) {
		clearTimeout( config.timeout );
		config.timeout = setTimeout(function() {
			if ( config.current ) {
				config.current.semaphore = 0;
				QUnit.pushFailure( "Test timed out", sourceFromStacktrace( 2 ) );
			} else {
				throw new Error( "Test timed out" );
			}
			resumeProcessing();
		}, config.testTimeout );
	}
}

function saveGlobal() {
	config.pollution = [];

	if ( config.noglobals ) {
		for ( var key in window ) {
			if ( hasOwn.call( window, key ) ) {
				// in Opera sometimes DOM element ids show up here, ignore them
				if ( /^qunit-test-output/.test( key ) ) {
					continue;
				}
				config.pollution.push( key );
			}
		}
	}
}

function checkPollution() {
	var newGlobals,
		deletedGlobals,
		old = config.pollution;

	saveGlobal();

	newGlobals = diff( config.pollution, old );
	if ( newGlobals.length > 0 ) {
		QUnit.pushFailure( "Introduced global variable(s): " + newGlobals.join( ", " ) );
	}

	deletedGlobals = diff( old, config.pollution );
	if ( deletedGlobals.length > 0 ) {
		QUnit.pushFailure( "Deleted global variable(s): " + deletedGlobals.join( ", " ) );
	}
}

// returns a new Array with the elements that are in a but not in b
function diff( a, b ) {
	var i, j,
		result = a.slice();

	for ( i = 0; i < result.length; i++ ) {
		for ( j = 0; j < b.length; j++ ) {
			if ( result[ i ] === b[ j ] ) {
				result.splice( i, 1 );
				i--;
				break;
			}
		}
	}
	return result;
}

function extend( a, b, undefOnly ) {
	for ( var prop in b ) {
		if ( hasOwn.call( b, prop ) ) {

			// Avoid "Member not found" error in IE8 caused by messing with window.constructor
			if ( !( prop === "constructor" && a === window ) ) {
				if ( b[ prop ] === undefined ) {
					delete a[ prop ];
				} else if ( !( undefOnly && typeof a[ prop ] !== "undefined" ) ) {
					a[ prop ] = b[ prop ];
				}
			}
		}
	}

	return a;
}

function runLoggingCallbacks( key, args ) {
	var i, l, callbacks;

	callbacks = config.callbacks[ key ];
	for ( i = 0, l = callbacks.length; i < l; i++ ) {
		callbacks[ i ]( args );
	}
}

// DEPRECATED: This will be removed on 2.0.0+
// This function verifies if the loggingCallbacks were modified by the user
// If so, it will restore it, assign the given callback and print a console warning
function verifyLoggingCallbacks() {
	var loggingCallback, userCallback;

	for ( loggingCallback in loggingCallbacks ) {
		if ( QUnit[ loggingCallback ] !== loggingCallbacks[ loggingCallback ] ) {

			userCallback = QUnit[ loggingCallback ];

			// Restore the callback function
			QUnit[ loggingCallback ] = loggingCallbacks[ loggingCallback ];

			// Assign the deprecated given callback
			QUnit[ loggingCallback ]( userCallback );

			if ( window.console && window.console.warn ) {
				window.console.warn(
					"QUnit." + loggingCallback + " was replaced with a new value.\n" +
					"Please, check out the documentation on how to apply logging callbacks.\n" +
					"Reference: http://api.qunitjs.com/category/callbacks/"
				);
			}
		}
	}
}

// from jquery.js
function inArray( elem, array ) {
	if ( array.indexOf ) {
		return array.indexOf( elem );
	}

	for ( var i = 0, length = array.length; i < length; i++ ) {
		if ( array[ i ] === elem ) {
			return i;
		}
	}

	return -1;
}

function Test( settings ) {
	var i, l;

	++Test.count;

	extend( this, settings );
	this.assertions = [];
	this.semaphore = 0;
	this.usedAsync = false;
	this.module = config.currentModule;
	this.stack = sourceFromStacktrace( 3 );

	// Register unique strings
	for ( i = 0, l = this.module.tests; i < l.length; i++ ) {
		if ( this.module.tests[ i ].name === this.testName ) {
			this.testName += " ";
		}
	}

	this.testId = generateHash( this.module.name, this.testName );

	this.module.tests.push({
		name: this.testName,
		testId: this.testId
	});

	if ( settings.skip ) {

		// Skipped tests will fully ignore any sent callback
		this.callback = function() {};
		this.async = false;
		this.expected = 0;
	} else {
		this.assert = new Assert( this );
	}
}

Test.count = 0;

Test.prototype = {
	before: function() {
		if (

			// Emit moduleStart when we're switching from one module to another
			this.module !== config.previousModule ||

				// They could be equal (both undefined) but if the previousModule property doesn't
				// yet exist it means this is the first test in a suite that isn't wrapped in a
				// module, in which case we'll just emit a moduleStart event for 'undefined'.
				// Without this, reporters can get testStart before moduleStart  which is a problem.
				!hasOwn.call( config, "previousModule" )
		) {
			if ( hasOwn.call( config, "previousModule" ) ) {
				runLoggingCallbacks( "moduleDone", {
					name: config.previousModule.name,
					tests: config.previousModule.tests,
					failed: config.moduleStats.bad,
					passed: config.moduleStats.all - config.moduleStats.bad,
					total: config.moduleStats.all,
					runtime: now() - config.moduleStats.started
				});
			}
			config.previousModule = this.module;
			config.moduleStats = { all: 0, bad: 0, started: now() };
			runLoggingCallbacks( "moduleStart", {
				name: this.module.name,
				tests: this.module.tests
			});
		}

		config.current = this;

		this.testEnvironment = extend( {}, this.module.testEnvironment );
		delete this.testEnvironment.beforeEach;
		delete this.testEnvironment.afterEach;

		this.started = now();
		runLoggingCallbacks( "testStart", {
			name: this.testName,
			module: this.module.name,
			testId: this.testId
		});

		if ( !config.pollution ) {
			saveGlobal();
		}
	},

	run: function() {
		var promise;

		config.current = this;

		if ( this.async ) {
			QUnit.stop();
		}

		this.callbackStarted = now();

		if ( config.notrycatch ) {
			promise = this.callback.call( this.testEnvironment, this.assert );
			this.resolvePromise( promise );
			return;
		}

		try {
			promise = this.callback.call( this.testEnvironment, this.assert );
			this.resolvePromise( promise );
		} catch ( e ) {
			this.pushFailure( "Died on test #" + ( this.assertions.length + 1 ) + " " +
				this.stack + ": " + ( e.message || e ), extractStacktrace( e, 0 ) );

			// else next test will carry the responsibility
			saveGlobal();

			// Restart the tests if they're blocking
			if ( config.blocking ) {
				QUnit.start();
			}
		}
	},

	after: function() {
		checkPollution();
	},

	queueHook: function( hook, hookName ) {
		var promise,
			test = this;
		return function runHook() {
			config.current = test;
			if ( config.notrycatch ) {
				promise = hook.call( test.testEnvironment, test.assert );
				test.resolvePromise( promise, hookName );
				return;
			}
			try {
				promise = hook.call( test.testEnvironment, test.assert );
				test.resolvePromise( promise, hookName );
			} catch ( error ) {
				test.pushFailure( hookName + " failed on " + test.testName + ": " +
					( error.message || error ), extractStacktrace( error, 0 ) );
			}
		};
	},

	// Currently only used for module level hooks, can be used to add global level ones
	hooks: function( handler ) {
		var hooks = [];

		// Hooks are ignored on skipped tests
		if ( this.skip ) {
			return hooks;
		}

		if ( this.module.testEnvironment &&
				QUnit.objectType( this.module.testEnvironment[ handler ] ) === "function" ) {
			hooks.push( this.queueHook( this.module.testEnvironment[ handler ], handler ) );
		}

		return hooks;
	},

	finish: function() {
		config.current = this;
		if ( config.requireExpects && this.expected === null ) {
			this.pushFailure( "Expected number of assertions to be defined, but expect() was " +
				"not called.", this.stack );
		} else if ( this.expected !== null && this.expected !== this.assertions.length ) {
			this.pushFailure( "Expected " + this.expected + " assertions, but " +
				this.assertions.length + " were run", this.stack );
		} else if ( this.expected === null && !this.assertions.length ) {
			this.pushFailure( "Expected at least one assertion, but none were run - call " +
				"expect(0) to accept zero assertions.", this.stack );
		}

		var i,
			bad = 0;

		this.runtime = now() - this.started;
		config.stats.all += this.assertions.length;
		config.moduleStats.all += this.assertions.length;

		for ( i = 0; i < this.assertions.length; i++ ) {
			if ( !this.assertions[ i ].result ) {
				bad++;
				config.stats.bad++;
				config.moduleStats.bad++;
			}
		}

		runLoggingCallbacks( "testDone", {
			name: this.testName,
			module: this.module.name,
			skipped: !!this.skip,
			failed: bad,
			passed: this.assertions.length - bad,
			total: this.assertions.length,
			runtime: this.runtime,

			// HTML Reporter use
			assertions: this.assertions,
			testId: this.testId,

			// DEPRECATED: this property will be removed in 2.0.0, use runtime instead
			duration: this.runtime
		});

		// QUnit.reset() is deprecated and will be replaced for a new
		// fixture reset function on QUnit 2.0/2.1.
		// It's still called here for backwards compatibility handling
		QUnit.reset();

		config.current = undefined;
	},

	queue: function() {
		var bad,
			test = this;

		if ( !this.valid() ) {
			return;
		}

		function run() {

			// each of these can by async
			synchronize([
				function() {
					test.before();
				},

				test.hooks( "beforeEach" ),

				function() {
					test.run();
				},

				test.hooks( "afterEach" ).reverse(),

				function() {
					test.after();
				},
				function() {
					test.finish();
				}
			]);
		}

		// `bad` initialized at top of scope
		// defer when previous test run passed, if storage is available
		bad = QUnit.config.reorder && defined.sessionStorage &&
				+sessionStorage.getItem( "qunit-test-" + this.module.name + "-" + this.testName );

		if ( bad ) {
			run();
		} else {
			synchronize( run, true );
		}
	},

	push: function( result, actual, expected, message ) {
		var source,
			details = {
				module: this.module.name,
				name: this.testName,
				result: result,
				message: message,
				actual: actual,
				expected: expected,
				testId: this.testId,
				runtime: now() - this.started
			};

		if ( !result ) {
			source = sourceFromStacktrace();

			if ( source ) {
				details.source = source;
			}
		}

		runLoggingCallbacks( "log", details );

		this.assertions.push({
			result: !!result,
			message: message
		});
	},

	pushFailure: function( message, source, actual ) {
		if ( !this instanceof Test ) {
			throw new Error( "pushFailure() assertion outside test context, was " +
				sourceFromStacktrace( 2 ) );
		}

		var details = {
				module: this.module.name,
				name: this.testName,
				result: false,
				message: message || "error",
				actual: actual || null,
				testId: this.testId,
				runtime: now() - this.started
			};

		if ( source ) {
			details.source = source;
		}

		runLoggingCallbacks( "log", details );

		this.assertions.push({
			result: false,
			message: message
		});
	},

	resolvePromise: function( promise, phase ) {
		var then, message,
			test = this;
		if ( promise != null ) {
			then = promise.then;
			if ( QUnit.objectType( then ) === "function" ) {
				QUnit.stop();
				then.call(
					promise,
					QUnit.start,
					function( error ) {
						message = "Promise rejected " +
							( !phase ? "during" : phase.replace( /Each$/, "" ) ) +
							" " + test.testName + ": " + ( error.message || error );
						test.pushFailure( message, extractStacktrace( error, 0 ) );

						// else next test will carry the responsibility
						saveGlobal();

						// Unblock
						QUnit.start();
					}
				);
			}
		}
	},

	valid: function() {
		var include,
			filter = config.filter && config.filter.toLowerCase(),
			module = QUnit.urlParams.module && QUnit.urlParams.module.toLowerCase(),
			fullName = ( this.module.name + ": " + this.testName ).toLowerCase();

		// Internally-generated tests are always valid
		if ( this.callback && this.callback.validTest ) {
			return true;
		}

		if ( config.testId.length > 0 && inArray( this.testId, config.testId ) < 0 ) {
			return false;
		}

		if ( module && ( !this.module.name || this.module.name.toLowerCase() !== module ) ) {
			return false;
		}

		if ( !filter ) {
			return true;
		}

		include = filter.charAt( 0 ) !== "!";
		if ( !include ) {
			filter = filter.slice( 1 );
		}

		// If the filter matches, we need to honour include
		if ( fullName.indexOf( filter ) !== -1 ) {
			return include;
		}

		// Otherwise, do the opposite
		return !include;
	}

};

// Resets the test setup. Useful for tests that modify the DOM.
/*
DEPRECATED: Use multiple tests instead of resetting inside a test.
Use testStart or testDone for custom cleanup.
This method will throw an error in 2.0, and will be removed in 2.1
*/
QUnit.reset = function() {

	// Return on non-browser environments
	// This is necessary to not break on node tests
	if ( typeof window === "undefined" ) {
		return;
	}

	var fixture = defined.document && document.getElementById &&
			document.getElementById( "qunit-fixture" );

	if ( fixture ) {
		fixture.innerHTML = config.fixture;
	}
};

QUnit.pushFailure = function() {
	if ( !QUnit.config.current ) {
		throw new Error( "pushFailure() assertion outside test context, in " +
			sourceFromStacktrace( 2 ) );
	}

	// Gets current test obj
	var currentTest = QUnit.config.current;

	return currentTest.pushFailure.apply( currentTest, arguments );
};

// Based on Java's String.hashCode, a simple but not
// rigorously collision resistant hashing function
function generateHash( module, testName ) {
	var hex,
		i = 0,
		hash = 0,
		str = module + "\x1C" + testName,
		len = str.length;

	for ( ; i < len; i++ ) {
		hash  = ( ( hash << 5 ) - hash ) + str.charCodeAt( i );
		hash |= 0;
	}

	// Convert the possibly negative integer hash code into an 8 character hex string, which isn't
	// strictly necessary but increases user understanding that the id is a SHA-like hash
	hex = ( 0x100000000 + hash ).toString( 16 );
	if ( hex.length < 8 ) {
		hex = "0000000" + hex;
	}

	return hex.slice( -8 );
}

function Assert( testContext ) {
	this.test = testContext;
}

// Assert helpers
QUnit.assert = Assert.prototype = {

	// Specify the number of expected assertions to guarantee that failed test
	// (no assertions are run at all) don't slip through.
	expect: function( asserts ) {
		if ( arguments.length === 1 ) {
			this.test.expected = asserts;
		} else {
			return this.test.expected;
		}
	},

	// Increment this Test's semaphore counter, then return a single-use function that
	// decrements that counter a maximum of once.
	async: function() {
		var test = this.test,
			popped = false;

		test.semaphore += 1;
		test.usedAsync = true;
		pauseProcessing();

		return function done() {
			if ( !popped ) {
				test.semaphore -= 1;
				popped = true;
				resumeProcessing();
			} else {
				test.pushFailure( "Called the callback returned from `assert.async` more than once",
					sourceFromStacktrace( 2 ) );
			}
		};
	},

	// Exports test.push() to the user API
	push: function( /* result, actual, expected, message */ ) {
		var assert = this,
			currentTest = ( assert instanceof Assert && assert.test ) || QUnit.config.current;

		// Backwards compatibility fix.
		// Allows the direct use of global exported assertions and QUnit.assert.*
		// Although, it's use is not recommended as it can leak assertions
		// to other tests from async tests, because we only get a reference to the current test,
		// not exactly the test where assertion were intended to be called.
		if ( !currentTest ) {
			throw new Error( "assertion outside test context, in " + sourceFromStacktrace( 2 ) );
		}

		if ( currentTest.usedAsync === true && currentTest.semaphore === 0 ) {
			currentTest.pushFailure( "Assertion after the final `assert.async` was resolved",
				sourceFromStacktrace( 2 ) );

			// Allow this assertion to continue running anyway...
		}

		if ( !( assert instanceof Assert ) ) {
			assert = currentTest.assert;
		}
		return assert.test.push.apply( assert.test, arguments );
	},

	ok: function( result, message ) {
		message = message || ( result ? "okay" : "failed, expected argument to be truthy, was: " +
			QUnit.dump.parse( result ) );
		this.push( !!result, result, true, message );
	},

	notOk: function( result, message ) {
		message = message || ( !result ? "okay" : "failed, expected argument to be falsy, was: " +
			QUnit.dump.parse( result ) );
		this.push( !result, result, false, message );
	},

	equal: function( actual, expected, message ) {
		/*jshint eqeqeq:false */
		this.push( expected == actual, actual, expected, message );
	},

	notEqual: function( actual, expected, message ) {
		/*jshint eqeqeq:false */
		this.push( expected != actual, actual, expected, message );
	},

	propEqual: function( actual, expected, message ) {
		actual = objectValues( actual );
		expected = objectValues( expected );
		this.push( QUnit.equiv( actual, expected ), actual, expected, message );
	},

	notPropEqual: function( actual, expected, message ) {
		actual = objectValues( actual );
		expected = objectValues( expected );
		this.push( !QUnit.equiv( actual, expected ), actual, expected, message );
	},

	deepEqual: function( actual, expected, message ) {
		this.push( QUnit.equiv( actual, expected ), actual, expected, message );
	},

	notDeepEqual: function( actual, expected, message ) {
		this.push( !QUnit.equiv( actual, expected ), actual, expected, message );
	},

	strictEqual: function( actual, expected, message ) {
		this.push( expected === actual, actual, expected, message );
	},

	notStrictEqual: function( actual, expected, message ) {
		this.push( expected !== actual, actual, expected, message );
	},

	"throws": function( block, expected, message ) {
		var actual, expectedType,
			expectedOutput = expected,
			ok = false,
			currentTest = ( this instanceof Assert && this.test ) || QUnit.config.current;

		// 'expected' is optional unless doing string comparison
		if ( message == null && typeof expected === "string" ) {
			message = expected;
			expected = null;
		}

		currentTest.ignoreGlobalErrors = true;
		try {
			block.call( currentTest.testEnvironment );
		} catch (e) {
			actual = e;
		}
		currentTest.ignoreGlobalErrors = false;

		if ( actual ) {
			expectedType = QUnit.objectType( expected );

			// we don't want to validate thrown error
			if ( !expected ) {
				ok = true;
				expectedOutput = null;

			// expected is a regexp
			} else if ( expectedType === "regexp" ) {
				ok = expected.test( errorString( actual ) );

			// expected is a string
			} else if ( expectedType === "string" ) {
				ok = expected === errorString( actual );

			// expected is a constructor, maybe an Error constructor
			} else if ( expectedType === "function" && actual instanceof expected ) {
				ok = true;

			// expected is an Error object
			} else if ( expectedType === "object" ) {
				ok = actual instanceof expected.constructor &&
					actual.name === expected.name &&
					actual.message === expected.message;

			// expected is a validation function which returns true if validation passed
			} else if ( expectedType === "function" && expected.call( {}, actual ) === true ) {
				expectedOutput = null;
				ok = true;
			}
		}

		currentTest.assert.push( ok, actual, expectedOutput, message );
	}
};

// Provide an alternative to assert.throws(), for enviroments that consider throws a reserved word
// Known to us are: Closure Compiler, Narwhal
(function() {
	/*jshint sub:true */
	Assert.prototype.raises = Assert.prototype[ "throws" ];
}());

// Test for equality any JavaScript type.
// Author: Philippe Rathé <prathe@gmail.com>
QUnit.equiv = (function() {

	// Call the o related callback with the given arguments.
	function bindCallbacks( o, callbacks, args ) {
		var prop = QUnit.objectType( o );
		if ( prop ) {
			if ( QUnit.objectType( callbacks[ prop ] ) === "function" ) {
				return callbacks[ prop ].apply( callbacks, args );
			} else {
				return callbacks[ prop ]; // or undefined
			}
		}
	}

	// the real equiv function
	var innerEquiv,

		// stack to decide between skip/abort functions
		callers = [],

		// stack to avoiding loops from circular referencing
		parents = [],
		parentsB = [],

		getProto = Object.getPrototypeOf || function( obj ) {
			/* jshint camelcase: false, proto: true */
			return obj.__proto__;
		},
		callbacks = (function() {

			// for string, boolean, number and null
			function useStrictEquality( b, a ) {

				/*jshint eqeqeq:false */
				if ( b instanceof a.constructor || a instanceof b.constructor ) {

					// to catch short annotation VS 'new' annotation of a
					// declaration
					// e.g. var i = 1;
					// var j = new Number(1);
					return a == b;
				} else {
					return a === b;
				}
			}

			return {
				"string": useStrictEquality,
				"boolean": useStrictEquality,
				"number": useStrictEquality,
				"null": useStrictEquality,
				"undefined": useStrictEquality,

				"nan": function( b ) {
					return isNaN( b );
				},

				"date": function( b, a ) {
					return QUnit.objectType( b ) === "date" && a.valueOf() === b.valueOf();
				},

				"regexp": function( b, a ) {
					return QUnit.objectType( b ) === "regexp" &&

						// the regex itself
						a.source === b.source &&

						// and its modifiers
						a.global === b.global &&

						// (gmi) ...
						a.ignoreCase === b.ignoreCase &&
						a.multiline === b.multiline &&
						a.sticky === b.sticky;
				},

				// - skip when the property is a method of an instance (OOP)
				// - abort otherwise,
				// initial === would have catch identical references anyway
				"function": function() {
					var caller = callers[ callers.length - 1 ];
					return caller !== Object && typeof caller !== "undefined";
				},

				"array": function( b, a ) {
					var i, j, len, loop, aCircular, bCircular;

					// b could be an object literal here
					if ( QUnit.objectType( b ) !== "array" ) {
						return false;
					}

					len = a.length;
					if ( len !== b.length ) {
						// safe and faster
						return false;
					}

					// track reference to avoid circular references
					parents.push( a );
					parentsB.push( b );
					for ( i = 0; i < len; i++ ) {
						loop = false;
						for ( j = 0; j < parents.length; j++ ) {
							aCircular = parents[ j ] === a[ i ];
							bCircular = parentsB[ j ] === b[ i ];
							if ( aCircular || bCircular ) {
								if ( a[ i ] === b[ i ] || aCircular && bCircular ) {
									loop = true;
								} else {
									parents.pop();
									parentsB.pop();
									return false;
								}
							}
						}
						if ( !loop && !innerEquiv( a[ i ], b[ i ] ) ) {
							parents.pop();
							parentsB.pop();
							return false;
						}
					}
					parents.pop();
					parentsB.pop();
					return true;
				},

				"object": function( b, a ) {

					/*jshint forin:false */
					var i, j, loop, aCircular, bCircular,
						// Default to true
						eq = true,
						aProperties = [],
						bProperties = [];

					// comparing constructors is more strict than using
					// instanceof
					if ( a.constructor !== b.constructor ) {

						// Allow objects with no prototype to be equivalent to
						// objects with Object as their constructor.
						if ( !( ( getProto( a ) === null && getProto( b ) === Object.prototype ) ||
							( getProto( b ) === null && getProto( a ) === Object.prototype ) ) ) {
							return false;
						}
					}

					// stack constructor before traversing properties
					callers.push( a.constructor );

					// track reference to avoid circular references
					parents.push( a );
					parentsB.push( b );

					// be strict: don't ensure hasOwnProperty and go deep
					for ( i in a ) {
						loop = false;
						for ( j = 0; j < parents.length; j++ ) {
							aCircular = parents[ j ] === a[ i ];
							bCircular = parentsB[ j ] === b[ i ];
							if ( aCircular || bCircular ) {
								if ( a[ i ] === b[ i ] || aCircular && bCircular ) {
									loop = true;
								} else {
									eq = false;
									break;
								}
							}
						}
						aProperties.push( i );
						if ( !loop && !innerEquiv( a[ i ], b[ i ] ) ) {
							eq = false;
							break;
						}
					}

					parents.pop();
					parentsB.pop();
					callers.pop(); // unstack, we are done

					for ( i in b ) {
						bProperties.push( i ); // collect b's properties
					}

					// Ensures identical properties name
					return eq && innerEquiv( aProperties.sort(), bProperties.sort() );
				}
			};
		}());

	innerEquiv = function() { // can take multiple arguments
		var args = [].slice.apply( arguments );
		if ( args.length < 2 ) {
			return true; // end transition
		}

		return ( (function( a, b ) {
			if ( a === b ) {
				return true; // catch the most you can
			} else if ( a === null || b === null || typeof a === "undefined" ||
					typeof b === "undefined" ||
					QUnit.objectType( a ) !== QUnit.objectType( b ) ) {

				// don't lose time with error prone cases
				return false;
			} else {
				return bindCallbacks( a, callbacks, [ b, a ] );
			}

			// apply transition with (1..n) arguments
		}( args[ 0 ], args[ 1 ] ) ) &&
			innerEquiv.apply( this, args.splice( 1, args.length - 1 ) ) );
	};

	return innerEquiv;
}());

// Based on jsDump by Ariel Flesler
// http://flesler.blogspot.com/2008/05/jsdump-pretty-dump-of-any-javascript.html
QUnit.dump = (function() {
	function quote( str ) {
		return "\"" + str.toString().replace( /"/g, "\\\"" ) + "\"";
	}
	function literal( o ) {
		return o + "";
	}
	function join( pre, arr, post ) {
		var s = dump.separator(),
			base = dump.indent(),
			inner = dump.indent( 1 );
		if ( arr.join ) {
			arr = arr.join( "," + s + inner );
		}
		if ( !arr ) {
			return pre + post;
		}
		return [ pre, inner + arr, base + post ].join( s );
	}
	function array( arr, stack ) {
		var i = arr.length,
			ret = new Array( i );

		if ( dump.maxDepth && dump.depth > dump.maxDepth ) {
			return "[object Array]";
		}

		this.up();
		while ( i-- ) {
			ret[ i ] = this.parse( arr[ i ], undefined, stack );
		}
		this.down();
		return join( "[", ret, "]" );
	}

	var reName = /^function (\w+)/,
		dump = {

			// objType is used mostly internally, you can fix a (custom) type in advance
			parse: function( obj, objType, stack ) {
				stack = stack || [];
				var res, parser, parserType,
					inStack = inArray( obj, stack );

				if ( inStack !== -1 ) {
					return "recursion(" + ( inStack - stack.length ) + ")";
				}

				objType = objType || this.typeOf( obj  );
				parser = this.parsers[ objType ];
				parserType = typeof parser;

				if ( parserType === "function" ) {
					stack.push( obj );
					res = parser.call( this, obj, stack );
					stack.pop();
					return res;
				}
				return ( parserType === "string" ) ? parser : this.parsers.error;
			},
			typeOf: function( obj ) {
				var type;
				if ( obj === null ) {
					type = "null";
				} else if ( typeof obj === "undefined" ) {
					type = "undefined";
				} else if ( QUnit.is( "regexp", obj ) ) {
					type = "regexp";
				} else if ( QUnit.is( "date", obj ) ) {
					type = "date";
				} else if ( QUnit.is( "function", obj ) ) {
					type = "function";
				} else if ( obj.setInterval !== undefined &&
						obj.document !== undefined &&
						obj.nodeType === undefined ) {
					type = "window";
				} else if ( obj.nodeType === 9 ) {
					type = "document";
				} else if ( obj.nodeType ) {
					type = "node";
				} else if (

					// native arrays
					toString.call( obj ) === "[object Array]" ||

					// NodeList objects
					( typeof obj.length === "number" && obj.item !== undefined &&
					( obj.length ? obj.item( 0 ) === obj[ 0 ] : ( obj.item( 0 ) === null &&
					obj[ 0 ] === undefined ) ) )
				) {
					type = "array";
				} else if ( obj.constructor === Error.prototype.constructor ) {
					type = "error";
				} else {
					type = typeof obj;
				}
				return type;
			},
			separator: function() {
				return this.multiline ? this.HTML ? "<br />" : "\n" : this.HTML ? "&#160;" : " ";
			},
			// extra can be a number, shortcut for increasing-calling-decreasing
			indent: function( extra ) {
				if ( !this.multiline ) {
					return "";
				}
				var chr = this.indentChar;
				if ( this.HTML ) {
					chr = chr.replace( /\t/g, "   " ).replace( / /g, "&#160;" );
				}
				return new Array( this.depth + ( extra || 0 ) ).join( chr );
			},
			up: function( a ) {
				this.depth += a || 1;
			},
			down: function( a ) {
				this.depth -= a || 1;
			},
			setParser: function( name, parser ) {
				this.parsers[ name ] = parser;
			},
			// The next 3 are exposed so you can use them
			quote: quote,
			literal: literal,
			join: join,
			//
			depth: 1,
			maxDepth: QUnit.config.maxDepth,

			// This is the list of parsers, to modify them, use dump.setParser
			parsers: {
				window: "[Window]",
				document: "[Document]",
				error: function( error ) {
					return "Error(\"" + error.message + "\")";
				},
				unknown: "[Unknown]",
				"null": "null",
				"undefined": "undefined",
				"function": function( fn ) {
					var ret = "function",

						// functions never have name in IE
						name = "name" in fn ? fn.name : ( reName.exec( fn ) || [] )[ 1 ];

					if ( name ) {
						ret += " " + name;
					}
					ret += "( ";

					ret = [ ret, dump.parse( fn, "functionArgs" ), "){" ].join( "" );
					return join( ret, dump.parse( fn, "functionCode" ), "}" );
				},
				array: array,
				nodelist: array,
				"arguments": array,
				object: function( map, stack ) {
					var keys, key, val, i, nonEnumerableProperties,
						ret = [];

					if ( dump.maxDepth && dump.depth > dump.maxDepth ) {
						return "[object Object]";
					}

					dump.up();
					keys = [];
					for ( key in map ) {
						keys.push( key );
					}

					// Some properties are not always enumerable on Error objects.
					nonEnumerableProperties = [ "message", "name" ];
					for ( i in nonEnumerableProperties ) {
						key = nonEnumerableProperties[ i ];
						if ( key in map && inArray( key, keys ) < 0 ) {
							keys.push( key );
						}
					}
					keys.sort();
					for ( i = 0; i < keys.length; i++ ) {
						key = keys[ i ];
						val = map[ key ];
						ret.push( dump.parse( key, "key" ) + ": " +
							dump.parse( val, undefined, stack ) );
					}
					dump.down();
					return join( "{", ret, "}" );
				},
				node: function( node ) {
					var len, i, val,
						open = dump.HTML ? "&lt;" : "<",
						close = dump.HTML ? "&gt;" : ">",
						tag = node.nodeName.toLowerCase(),
						ret = open + tag,
						attrs = node.attributes;

					if ( attrs ) {
						for ( i = 0, len = attrs.length; i < len; i++ ) {
							val = attrs[ i ].nodeValue;

							// IE6 includes all attributes in .attributes, even ones not explicitly
							// set. Those have values like undefined, null, 0, false, "" or
							// "inherit".
							if ( val && val !== "inherit" ) {
								ret += " " + attrs[ i ].nodeName + "=" +
									dump.parse( val, "attribute" );
							}
						}
					}
					ret += close;

					// Show content of TextNode or CDATASection
					if ( node.nodeType === 3 || node.nodeType === 4 ) {
						ret += node.nodeValue;
					}

					return ret + open + "/" + tag + close;
				},

				// function calls it internally, it's the arguments part of the function
				functionArgs: function( fn ) {
					var args,
						l = fn.length;

					if ( !l ) {
						return "";
					}

					args = new Array( l );
					while ( l-- ) {

						// 97 is 'a'
						args[ l ] = String.fromCharCode( 97 + l );
					}
					return " " + args.join( ", " ) + " ";
				},
				// object calls it internally, the key part of an item in a map
				key: quote,
				// function calls it internally, it's the content of the function
				functionCode: "[code]",
				// node calls it internally, it's an html attribute value
				attribute: quote,
				string: quote,
				date: quote,
				regexp: literal,
				number: literal,
				"boolean": literal
			},
			// if true, entities are escaped ( <, >, \t, space and \n )
			HTML: false,
			// indentation unit
			indentChar: "  ",
			// if true, items in a collection, are separated by a \n, else just a space.
			multiline: true
		};

	return dump;
}());

// back compat
QUnit.jsDump = QUnit.dump;

// For browser, export only select globals
if ( typeof window !== "undefined" ) {

	// Deprecated
	// Extend assert methods to QUnit and Global scope through Backwards compatibility
	(function() {
		var i,
			assertions = Assert.prototype;

		function applyCurrent( current ) {
			return function() {
				var assert = new Assert( QUnit.config.current );
				current.apply( assert, arguments );
			};
		}

		for ( i in assertions ) {
			QUnit[ i ] = applyCurrent( assertions[ i ] );
		}
	})();

	(function() {
		var i, l,
			keys = [
				"test",
				"module",
				"expect",
				"asyncTest",
				"start",
				"stop",
				"ok",
				"notOk",
				"equal",
				"notEqual",
				"propEqual",
				"notPropEqual",
				"deepEqual",
				"notDeepEqual",
				"strictEqual",
				"notStrictEqual",
				"throws"
			];

		for ( i = 0, l = keys.length; i < l; i++ ) {
			window[ keys[ i ] ] = QUnit[ keys[ i ] ];
		}
	})();

	window.QUnit = QUnit;
}

// For nodejs
if ( typeof module !== "undefined" && module && module.exports ) {
	module.exports = QUnit;

	// For consistency with CommonJS environments' exports
	module.exports.QUnit = QUnit;
}

// For CommonJS with exports, but without module.exports, like Rhino
if ( typeof exports !== "undefined" && exports ) {
	exports.QUnit = QUnit;
}

if ( typeof define === "function" && define.amd ) {
	define( function() {
		return QUnit;
	} );
	QUnit.config.autostart = false;
}

// Get a reference to the global object, like window in browsers
}( (function() {
	return this;
})() ));

/*istanbul ignore next */
// jscs:disable maximumLineLength
/*
 * This file is a modified version of google-diff-match-patch's JavaScript implementation
 * (https://code.google.com/p/google-diff-match-patch/source/browse/trunk/javascript/diff_match_patch_uncompressed.js),
 * modifications are licensed as more fully set forth in LICENSE.txt.
 *
 * The original source of google-diff-match-patch is attributable and licensed as follows:
 *
 * Copyright 2006 Google Inc.
 * http://code.google.com/p/google-diff-match-patch/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * More Info:
 *  https://code.google.com/p/google-diff-match-patch/
 *
 * Usage: QUnit.diff(expected, actual)
 *
 * QUnit.diff( "the quick brown fox jumped over", "the quick fox jumps over" ) === "the  quick <del>brown </del> fox jump<ins>s</ins><del>ed</del over"
 */
QUnit.diff = (function() {

    function DiffMatchPatch() {

        // Defaults.
        // Redefine these in your program to override the defaults.

        // Number of seconds to map a diff before giving up (0 for infinity).
        this.DiffTimeout = 1.0;
        // Cost of an empty edit operation in terms of edit characters.
        this.DiffEditCost = 4;
    }

    //  DIFF FUNCTIONS

    /**
     * The data structure representing a diff is an array of tuples:
     * [[DIFF_DELETE, 'Hello'], [DIFF_INSERT, 'Goodbye'], [DIFF_EQUAL, ' world.']]
     * which means: delete 'Hello', add 'Goodbye' and keep ' world.'
     */
    var DIFF_DELETE = -1,
		DIFF_INSERT = 1,
		DIFF_EQUAL = 0;

    /**
     * Find the differences between two texts.  Simplifies the problem by stripping
     * any common prefix or suffix off the texts before diffing.
     * @param {string} text1 Old string to be diffed.
     * @param {string} text2 New string to be diffed.
     * @param {boolean=} optChecklines Optional speedup flag. If present and false,
     *     then don't run a line-level diff first to identify the changed areas.
     *     Defaults to true, which does a faster, slightly less optimal diff.
     * @param {number} optDeadline Optional time when the diff should be complete
     *     by.  Used internally for recursive calls.  Users should set DiffTimeout
     *     instead.
     * @return {!Array.<!DiffMatchPatch.Diff>} Array of diff tuples.
     */
    DiffMatchPatch.prototype.DiffMain = function( text1, text2, optChecklines, optDeadline ) {
        var deadline, checklines, commonlength,
			commonprefix, commonsuffix, diffs;
        // Set a deadline by which time the diff must be complete.
        if ( typeof optDeadline === "undefined" ) {
            if ( this.DiffTimeout <= 0 ) {
                optDeadline = Number.MAX_VALUE;
            } else {
                optDeadline = ( new Date() ).getTime() + this.DiffTimeout * 1000;
            }
        }
        deadline = optDeadline;

        // Check for null inputs.
        if ( text1 === null || text2 === null ) {
            throw new Error( "Null input. (DiffMain)" );
        }

        // Check for equality (speedup).
        if ( text1 === text2 ) {
            if ( text1 ) {
                return [
                    [ DIFF_EQUAL, text1 ]
                ];
            }
            return [];
        }

        if ( typeof optChecklines === "undefined" ) {
            optChecklines = true;
        }

        checklines = optChecklines;

        // Trim off common prefix (speedup).
        commonlength = this.diffCommonPrefix( text1, text2 );
        commonprefix = text1.substring( 0, commonlength );
        text1 = text1.substring( commonlength );
        text2 = text2.substring( commonlength );

        // Trim off common suffix (speedup).
        /////////
        commonlength = this.diffCommonSuffix( text1, text2 );
        commonsuffix = text1.substring( text1.length - commonlength );
        text1 = text1.substring( 0, text1.length - commonlength );
        text2 = text2.substring( 0, text2.length - commonlength );

        // Compute the diff on the middle block.
        diffs = this.diffCompute( text1, text2, checklines, deadline );

        // Restore the prefix and suffix.
        if ( commonprefix ) {
            diffs.unshift( [ DIFF_EQUAL, commonprefix ] );
        }
        if ( commonsuffix ) {
            diffs.push( [ DIFF_EQUAL, commonsuffix ] );
        }
        this.diffCleanupMerge( diffs );
        return diffs;
    };

    /**
     * Reduce the number of edits by eliminating operationally trivial equalities.
     * @param {!Array.<!DiffMatchPatch.Diff>} diffs Array of diff tuples.
     */
    DiffMatchPatch.prototype.diffCleanupEfficiency = function( diffs ) {
        var changes, equalities, equalitiesLength, lastequality,
			pointer, preIns, preDel, postIns, postDel;
        changes = false;
        equalities = []; // Stack of indices where equalities are found.
        equalitiesLength = 0; // Keeping our own length var is faster in JS.
        /** @type {?string} */
        lastequality = null;
        // Always equal to diffs[equalities[equalitiesLength - 1]][1]
        pointer = 0; // Index of current position.
        // Is there an insertion operation before the last equality.
        preIns = false;
        // Is there a deletion operation before the last equality.
        preDel = false;
        // Is there an insertion operation after the last equality.
        postIns = false;
        // Is there a deletion operation after the last equality.
        postDel = false;
        while ( pointer < diffs.length ) {
            if ( diffs[ pointer ][ 0 ] === DIFF_EQUAL ) { // Equality found.
                if ( diffs[ pointer ][ 1 ].length < this.DiffEditCost && ( postIns || postDel ) ) {
                    // Candidate found.
                    equalities[ equalitiesLength++ ] = pointer;
                    preIns = postIns;
                    preDel = postDel;
                    lastequality = diffs[ pointer ][ 1 ];
                } else {
                    // Not a candidate, and can never become one.
                    equalitiesLength = 0;
                    lastequality = null;
                }
                postIns = postDel = false;
            } else { // An insertion or deletion.
                if ( diffs[ pointer ][ 0 ] === DIFF_DELETE ) {
                    postDel = true;
                } else {
                    postIns = true;
                }
                /*
                 * Five types to be split:
                 * <ins>A</ins><del>B</del>XY<ins>C</ins><del>D</del>
                 * <ins>A</ins>X<ins>C</ins><del>D</del>
                 * <ins>A</ins><del>B</del>X<ins>C</ins>
                 * <ins>A</del>X<ins>C</ins><del>D</del>
                 * <ins>A</ins><del>B</del>X<del>C</del>
                 */
                if ( lastequality && ( ( preIns && preDel && postIns && postDel ) ||
                        ( ( lastequality.length < this.DiffEditCost / 2 ) &&
                            ( preIns + preDel + postIns + postDel ) === 3 ) ) ) {
                    // Duplicate record.
                    diffs.splice( equalities[equalitiesLength - 1], 0, [ DIFF_DELETE, lastequality ] );
                    // Change second copy to insert.
                    diffs[ equalities[ equalitiesLength - 1 ] + 1 ][ 0 ] = DIFF_INSERT;
                    equalitiesLength--; // Throw away the equality we just deleted;
                    lastequality = null;
                    if (preIns && preDel) {
                        // No changes made which could affect previous entry, keep going.
                        postIns = postDel = true;
                        equalitiesLength = 0;
                    } else {
                        equalitiesLength--; // Throw away the previous equality.
                        pointer = equalitiesLength > 0 ? equalities[ equalitiesLength - 1 ] : -1;
                        postIns = postDel = false;
                    }
                    changes = true;
                }
            }
            pointer++;
        }

        if ( changes ) {
            this.diffCleanupMerge( diffs );
        }
    };

    /**
     * Convert a diff array into a pretty HTML report.
     * @param {!Array.<!DiffMatchPatch.Diff>} diffs Array of diff tuples.
     * @param {integer} string to be beautified.
     * @return {string} HTML representation.
     */
    DiffMatchPatch.prototype.diffPrettyHtml = function( diffs ) {
        var op, data, x, html = [];
        for ( x = 0; x < diffs.length; x++ ) {
            op = diffs[x][0]; // Operation (insert, delete, equal)
            data = diffs[x][1]; // Text of change.
            switch ( op ) {
                case DIFF_INSERT:
                    html[x] = "<ins>" + data + "</ins>";
                    break;
                case DIFF_DELETE:
                    html[x] = "<del>" + data + "</del>";
                    break;
                case DIFF_EQUAL:
                    html[x] = "<span>" + data + "</span>";
                    break;
            }
        }
        return html.join("");
    };

    /**
     * Determine the common prefix of two strings.
     * @param {string} text1 First string.
     * @param {string} text2 Second string.
     * @return {number} The number of characters common to the start of each
     *     string.
     */
    DiffMatchPatch.prototype.diffCommonPrefix = function( text1, text2 ) {
        var pointermid, pointermax, pointermin, pointerstart;
        // Quick check for common null cases.
        if ( !text1 || !text2 || text1.charAt(0) !== text2.charAt(0) ) {
            return 0;
        }
        // Binary search.
        // Performance analysis: http://neil.fraser.name/news/2007/10/09/
        pointermin = 0;
        pointermax = Math.min( text1.length, text2.length );
        pointermid = pointermax;
        pointerstart = 0;
        while ( pointermin < pointermid ) {
            if ( text1.substring( pointerstart, pointermid ) === text2.substring( pointerstart, pointermid ) ) {
                pointermin = pointermid;
                pointerstart = pointermin;
            } else {
                pointermax = pointermid;
            }
            pointermid = Math.floor( ( pointermax - pointermin ) / 2 + pointermin );
        }
        return pointermid;
    };

    /**
     * Determine the common suffix of two strings.
     * @param {string} text1 First string.
     * @param {string} text2 Second string.
     * @return {number} The number of characters common to the end of each string.
     */
    DiffMatchPatch.prototype.diffCommonSuffix = function( text1, text2 ) {
        var pointermid, pointermax, pointermin, pointerend;
        // Quick check for common null cases.
        if (!text1 || !text2 || text1.charAt(text1.length - 1) !== text2.charAt(text2.length - 1)) {
            return 0;
        }
        // Binary search.
        // Performance analysis: http://neil.fraser.name/news/2007/10/09/
        pointermin = 0;
        pointermax = Math.min(text1.length, text2.length);
        pointermid = pointermax;
        pointerend = 0;
        while ( pointermin < pointermid ) {
            if (text1.substring( text1.length - pointermid, text1.length - pointerend ) ===
                text2.substring( text2.length - pointermid, text2.length - pointerend ) ) {
                pointermin = pointermid;
                pointerend = pointermin;
            } else {
                pointermax = pointermid;
            }
            pointermid = Math.floor( ( pointermax - pointermin ) / 2 + pointermin );
        }
        return pointermid;
    };

    /**
     * Find the differences between two texts.  Assumes that the texts do not
     * have any common prefix or suffix.
     * @param {string} text1 Old string to be diffed.
     * @param {string} text2 New string to be diffed.
     * @param {boolean} checklines Speedup flag.  If false, then don't run a
     *     line-level diff first to identify the changed areas.
     *     If true, then run a faster, slightly less optimal diff.
     * @param {number} deadline Time when the diff should be complete by.
     * @return {!Array.<!DiffMatchPatch.Diff>} Array of diff tuples.
     * @private
     */
    DiffMatchPatch.prototype.diffCompute = function( text1, text2, checklines, deadline ) {
        var diffs, longtext, shorttext, i, hm,
			text1A, text2A, text1B, text2B,
			midCommon, diffsA, diffsB;

        if ( !text1 ) {
            // Just add some text (speedup).
            return [
                [ DIFF_INSERT, text2 ]
            ];
        }

        if (!text2) {
            // Just delete some text (speedup).
            return [
                [ DIFF_DELETE, text1 ]
            ];
        }

        longtext = text1.length > text2.length ? text1 : text2;
        shorttext = text1.length > text2.length ? text2 : text1;
        i = longtext.indexOf( shorttext );
        if ( i !== -1 ) {
            // Shorter text is inside the longer text (speedup).
            diffs = [
                [ DIFF_INSERT, longtext.substring( 0, i ) ],
                [ DIFF_EQUAL, shorttext ],
                [ DIFF_INSERT, longtext.substring( i + shorttext.length ) ]
            ];
            // Swap insertions for deletions if diff is reversed.
            if ( text1.length > text2.length ) {
                diffs[0][0] = diffs[2][0] = DIFF_DELETE;
            }
            return diffs;
        }

        if ( shorttext.length === 1 ) {
            // Single character string.
            // After the previous speedup, the character can't be an equality.
            return [
                [ DIFF_DELETE, text1 ],
                [ DIFF_INSERT, text2 ]
            ];
        }

        // Check to see if the problem can be split in two.
        hm = this.diffHalfMatch(text1, text2);
        if (hm) {
            // A half-match was found, sort out the return data.
            text1A = hm[0];
            text1B = hm[1];
            text2A = hm[2];
            text2B = hm[3];
            midCommon = hm[4];
            // Send both pairs off for separate processing.
            diffsA = this.DiffMain(text1A, text2A, checklines, deadline);
            diffsB = this.DiffMain(text1B, text2B, checklines, deadline);
            // Merge the results.
            return diffsA.concat([
                [ DIFF_EQUAL, midCommon ]
            ], diffsB);
        }

        if (checklines && text1.length > 100 && text2.length > 100) {
            return this.diffLineMode(text1, text2, deadline);
        }

        return this.diffBisect(text1, text2, deadline);
    };

    /**
     * Do the two texts share a substring which is at least half the length of the
     * longer text?
     * This speedup can produce non-minimal diffs.
     * @param {string} text1 First string.
     * @param {string} text2 Second string.
     * @return {Array.<string>} Five element Array, containing the prefix of
     *     text1, the suffix of text1, the prefix of text2, the suffix of
     *     text2 and the common middle.  Or null if there was no match.
     * @private
     */
    DiffMatchPatch.prototype.diffHalfMatch = function(text1, text2) {
        var longtext, shorttext, dmp,
			text1A, text2B, text2A, text1B, midCommon,
			hm1, hm2, hm;
        if (this.DiffTimeout <= 0) {
            // Don't risk returning a non-optimal diff if we have unlimited time.
            return null;
        }
        longtext = text1.length > text2.length ? text1 : text2;
        shorttext = text1.length > text2.length ? text2 : text1;
        if (longtext.length < 4 || shorttext.length * 2 < longtext.length) {
            return null; // Pointless.
        }
        dmp = this; // 'this' becomes 'window' in a closure.

        /**
         * Does a substring of shorttext exist within longtext such that the substring
         * is at least half the length of longtext?
         * Closure, but does not reference any external variables.
         * @param {string} longtext Longer string.
         * @param {string} shorttext Shorter string.
         * @param {number} i Start index of quarter length substring within longtext.
         * @return {Array.<string>} Five element Array, containing the prefix of
         *     longtext, the suffix of longtext, the prefix of shorttext, the suffix
         *     of shorttext and the common middle.  Or null if there was no match.
         * @private
         */
        function diffHalfMatchI(longtext, shorttext, i) {
            var seed, j, bestCommon, prefixLength, suffixLength,
				bestLongtextA, bestLongtextB, bestShorttextA, bestShorttextB;
            // Start with a 1/4 length substring at position i as a seed.
            seed = longtext.substring(i, i + Math.floor(longtext.length / 4));
            j = -1;
            bestCommon = "";
            while ((j = shorttext.indexOf(seed, j + 1)) !== -1) {
                prefixLength = dmp.diffCommonPrefix(longtext.substring(i),
                    shorttext.substring(j));
                suffixLength = dmp.diffCommonSuffix(longtext.substring(0, i),
                    shorttext.substring(0, j));
                if (bestCommon.length < suffixLength + prefixLength) {
                    bestCommon = shorttext.substring(j - suffixLength, j) +
                        shorttext.substring(j, j + prefixLength);
                    bestLongtextA = longtext.substring(0, i - suffixLength);
                    bestLongtextB = longtext.substring(i + prefixLength);
                    bestShorttextA = shorttext.substring(0, j - suffixLength);
                    bestShorttextB = shorttext.substring(j + prefixLength);
                }
            }
            if (bestCommon.length * 2 >= longtext.length) {
                return [ bestLongtextA, bestLongtextB,
                    bestShorttextA, bestShorttextB, bestCommon
                ];
            } else {
                return null;
            }
        }

        // First check if the second quarter is the seed for a half-match.
        hm1 = diffHalfMatchI(longtext, shorttext,
            Math.ceil(longtext.length / 4));
        // Check again based on the third quarter.
        hm2 = diffHalfMatchI(longtext, shorttext,
            Math.ceil(longtext.length / 2));
        if (!hm1 && !hm2) {
            return null;
        } else if (!hm2) {
            hm = hm1;
        } else if (!hm1) {
            hm = hm2;
        } else {
            // Both matched.  Select the longest.
            hm = hm1[4].length > hm2[4].length ? hm1 : hm2;
        }

        // A half-match was found, sort out the return data.
        text1A, text1B, text2A, text2B;
        if (text1.length > text2.length) {
            text1A = hm[0];
            text1B = hm[1];
            text2A = hm[2];
            text2B = hm[3];
        } else {
            text2A = hm[0];
            text2B = hm[1];
            text1A = hm[2];
            text1B = hm[3];
        }
        midCommon = hm[4];
        return [ text1A, text1B, text2A, text2B, midCommon ];
    };

    /**
     * Do a quick line-level diff on both strings, then rediff the parts for
     * greater accuracy.
     * This speedup can produce non-minimal diffs.
     * @param {string} text1 Old string to be diffed.
     * @param {string} text2 New string to be diffed.
     * @param {number} deadline Time when the diff should be complete by.
     * @return {!Array.<!DiffMatchPatch.Diff>} Array of diff tuples.
     * @private
     */
    DiffMatchPatch.prototype.diffLineMode = function(text1, text2, deadline) {
        var a, diffs, linearray, pointer, countInsert,
			countDelete, textInsert, textDelete, j;
        // Scan the text on a line-by-line basis first.
        a = this.diffLinesToChars(text1, text2);
        text1 = a.chars1;
        text2 = a.chars2;
        linearray = a.lineArray;

        diffs = this.DiffMain(text1, text2, false, deadline);

        // Convert the diff back to original text.
        this.diffCharsToLines(diffs, linearray);
        // Eliminate freak matches (e.g. blank lines)
        this.diffCleanupSemantic(diffs);

        // Rediff any replacement blocks, this time character-by-character.
        // Add a dummy entry at the end.
        diffs.push( [ DIFF_EQUAL, "" ] );
        pointer = 0;
        countDelete = 0;
        countInsert = 0;
        textDelete = "";
        textInsert = "";
        while (pointer < diffs.length) {
            switch ( diffs[pointer][0] ) {
                case DIFF_INSERT:
                    countInsert++;
                    textInsert += diffs[pointer][1];
                    break;
                case DIFF_DELETE:
                    countDelete++;
                    textDelete += diffs[pointer][1];
                    break;
                case DIFF_EQUAL:
                    // Upon reaching an equality, check for prior redundancies.
                    if (countDelete >= 1 && countInsert >= 1) {
                        // Delete the offending records and add the merged ones.
                        diffs.splice(pointer - countDelete - countInsert,
                            countDelete + countInsert);
                        pointer = pointer - countDelete - countInsert;
                        a = this.DiffMain(textDelete, textInsert, false, deadline);
                        for (j = a.length - 1; j >= 0; j--) {
                            diffs.splice( pointer, 0, a[j] );
                        }
                        pointer = pointer + a.length;
                    }
                    countInsert = 0;
                    countDelete = 0;
                    textDelete = "";
                    textInsert = "";
                    break;
            }
            pointer++;
        }
        diffs.pop(); // Remove the dummy entry at the end.

        return diffs;
    };

    /**
     * Find the 'middle snake' of a diff, split the problem in two
     * and return the recursively constructed diff.
     * See Myers 1986 paper: An O(ND) Difference Algorithm and Its Variations.
     * @param {string} text1 Old string to be diffed.
     * @param {string} text2 New string to be diffed.
     * @param {number} deadline Time at which to bail if not yet complete.
     * @return {!Array.<!DiffMatchPatch.Diff>} Array of diff tuples.
     * @private
     */
    DiffMatchPatch.prototype.diffBisect = function(text1, text2, deadline) {
        var text1Length, text2Length, maxD, vOffset, vLength,
			v1, v2, x, delta, front, k1start, k1end, k2start,
			k2end, k2Offset, k1Offset, x1, x2, y1, y2, d, k1, k2;
        // Cache the text lengths to prevent multiple calls.
        text1Length = text1.length;
        text2Length = text2.length;
        maxD = Math.ceil((text1Length + text2Length) / 2);
        vOffset = maxD;
        vLength = 2 * maxD;
        v1 = new Array(vLength);
        v2 = new Array(vLength);
        // Setting all elements to -1 is faster in Chrome & Firefox than mixing
        // integers and undefined.
        for (x = 0; x < vLength; x++) {
            v1[x] = -1;
            v2[x] = -1;
        }
        v1[vOffset + 1] = 0;
        v2[vOffset + 1] = 0;
        delta = text1Length - text2Length;
        // If the total number of characters is odd, then the front path will collide
        // with the reverse path.
        front = (delta % 2 !== 0);
        // Offsets for start and end of k loop.
        // Prevents mapping of space beyond the grid.
        k1start = 0;
        k1end = 0;
        k2start = 0;
        k2end = 0;
        for (d = 0; d < maxD; d++) {
            // Bail out if deadline is reached.
            if ((new Date()).getTime() > deadline) {
                break;
            }

            // Walk the front path one step.
            for (k1 = -d + k1start; k1 <= d - k1end; k1 += 2) {
                k1Offset = vOffset + k1;
                if ( k1 === -d || ( k1 !== d && v1[ k1Offset - 1 ] < v1[ k1Offset + 1 ] ) ) {
                    x1 = v1[k1Offset + 1];
                } else {
                    x1 = v1[k1Offset - 1] + 1;
                }
                y1 = x1 - k1;
                while (x1 < text1Length && y1 < text2Length &&
                    text1.charAt(x1) === text2.charAt(y1)) {
                    x1++;
                    y1++;
                }
                v1[k1Offset] = x1;
                if (x1 > text1Length) {
                    // Ran off the right of the graph.
                    k1end += 2;
                } else if (y1 > text2Length) {
                    // Ran off the bottom of the graph.
                    k1start += 2;
                } else if (front) {
                    k2Offset = vOffset + delta - k1;
                    if (k2Offset >= 0 && k2Offset < vLength && v2[k2Offset] !== -1) {
                        // Mirror x2 onto top-left coordinate system.
                        x2 = text1Length - v2[k2Offset];
                        if (x1 >= x2) {
                            // Overlap detected.
                            return this.diffBisectSplit(text1, text2, x1, y1, deadline);
                        }
                    }
                }
            }

            // Walk the reverse path one step.
            for (k2 = -d + k2start; k2 <= d - k2end; k2 += 2) {
                k2Offset = vOffset + k2;
                if ( k2 === -d || (k2 !== d && v2[ k2Offset - 1 ] < v2[ k2Offset + 1 ] ) ) {
                    x2 = v2[k2Offset + 1];
                } else {
                    x2 = v2[k2Offset - 1] + 1;
                }
                y2 = x2 - k2;
                while (x2 < text1Length && y2 < text2Length &&
                    text1.charAt(text1Length - x2 - 1) ===
                    text2.charAt(text2Length - y2 - 1)) {
                    x2++;
                    y2++;
                }
                v2[k2Offset] = x2;
                if (x2 > text1Length) {
                    // Ran off the left of the graph.
                    k2end += 2;
                } else if (y2 > text2Length) {
                    // Ran off the top of the graph.
                    k2start += 2;
                } else if (!front) {
                    k1Offset = vOffset + delta - k2;
                    if (k1Offset >= 0 && k1Offset < vLength && v1[k1Offset] !== -1) {
                        x1 = v1[k1Offset];
                        y1 = vOffset + x1 - k1Offset;
                        // Mirror x2 onto top-left coordinate system.
                        x2 = text1Length - x2;
                        if (x1 >= x2) {
                            // Overlap detected.
                            return this.diffBisectSplit(text1, text2, x1, y1, deadline);
                        }
                    }
                }
            }
        }
        // Diff took too long and hit the deadline or
        // number of diffs equals number of characters, no commonality at all.
        return [
            [ DIFF_DELETE, text1 ],
            [ DIFF_INSERT, text2 ]
        ];
    };

    /**
     * Given the location of the 'middle snake', split the diff in two parts
     * and recurse.
     * @param {string} text1 Old string to be diffed.
     * @param {string} text2 New string to be diffed.
     * @param {number} x Index of split point in text1.
     * @param {number} y Index of split point in text2.
     * @param {number} deadline Time at which to bail if not yet complete.
     * @return {!Array.<!DiffMatchPatch.Diff>} Array of diff tuples.
     * @private
     */
    DiffMatchPatch.prototype.diffBisectSplit = function( text1, text2, x, y, deadline ) {
        var text1a, text1b, text2a, text2b, diffs, diffsb;
        text1a = text1.substring(0, x);
        text2a = text2.substring(0, y);
        text1b = text1.substring(x);
        text2b = text2.substring(y);

        // Compute both diffs serially.
        diffs = this.DiffMain(text1a, text2a, false, deadline);
        diffsb = this.DiffMain(text1b, text2b, false, deadline);

        return diffs.concat(diffsb);
    };

    /**
     * Reduce the number of edits by eliminating semantically trivial equalities.
     * @param {!Array.<!DiffMatchPatch.Diff>} diffs Array of diff tuples.
     */
    DiffMatchPatch.prototype.diffCleanupSemantic = function(diffs) {
        var changes, equalities, equalitiesLength, lastequality,
			pointer, lengthInsertions2, lengthDeletions2, lengthInsertions1,
			lengthDeletions1, deletion, insertion, overlapLength1, overlapLength2;
        changes = false;
        equalities = []; // Stack of indices where equalities are found.
        equalitiesLength = 0; // Keeping our own length var is faster in JS.
        /** @type {?string} */
        lastequality = null;
        // Always equal to diffs[equalities[equalitiesLength - 1]][1]
        pointer = 0; // Index of current position.
        // Number of characters that changed prior to the equality.
        lengthInsertions1 = 0;
        lengthDeletions1 = 0;
        // Number of characters that changed after the equality.
        lengthInsertions2 = 0;
        lengthDeletions2 = 0;
        while (pointer < diffs.length) {
            if (diffs[pointer][0] === DIFF_EQUAL) { // Equality found.
                equalities[equalitiesLength++] = pointer;
                lengthInsertions1 = lengthInsertions2;
                lengthDeletions1 = lengthDeletions2;
                lengthInsertions2 = 0;
                lengthDeletions2 = 0;
                lastequality = diffs[pointer][1];
            } else { // An insertion or deletion.
                if (diffs[pointer][0] === DIFF_INSERT) {
                    lengthInsertions2 += diffs[pointer][1].length;
                } else {
                    lengthDeletions2 += diffs[pointer][1].length;
                }
                // Eliminate an equality that is smaller or equal to the edits on both
                // sides of it.
                if (lastequality && (lastequality.length <=
                        Math.max(lengthInsertions1, lengthDeletions1)) &&
                    (lastequality.length <= Math.max(lengthInsertions2,
                        lengthDeletions2))) {
                    // Duplicate record.
                    diffs.splice( equalities[ equalitiesLength - 1 ], 0, [ DIFF_DELETE, lastequality ] );
                    // Change second copy to insert.
                    diffs[equalities[equalitiesLength - 1] + 1][0] = DIFF_INSERT;
                    // Throw away the equality we just deleted.
                    equalitiesLength--;
                    // Throw away the previous equality (it needs to be reevaluated).
                    equalitiesLength--;
                    pointer = equalitiesLength > 0 ? equalities[equalitiesLength - 1] : -1;
                    lengthInsertions1 = 0; // Reset the counters.
                    lengthDeletions1 = 0;
                    lengthInsertions2 = 0;
                    lengthDeletions2 = 0;
                    lastequality = null;
                    changes = true;
                }
            }
            pointer++;
        }

        // Normalize the diff.
        if (changes) {
            this.diffCleanupMerge(diffs);
        }

        // Find any overlaps between deletions and insertions.
        // e.g: <del>abcxxx</del><ins>xxxdef</ins>
        //   -> <del>abc</del>xxx<ins>def</ins>
        // e.g: <del>xxxabc</del><ins>defxxx</ins>
        //   -> <ins>def</ins>xxx<del>abc</del>
        // Only extract an overlap if it is as big as the edit ahead or behind it.
        pointer = 1;
        while (pointer < diffs.length) {
            if (diffs[pointer - 1][0] === DIFF_DELETE &&
                diffs[pointer][0] === DIFF_INSERT) {
                deletion = diffs[pointer - 1][1];
                insertion = diffs[pointer][1];
                overlapLength1 = this.diffCommonOverlap(deletion, insertion);
                overlapLength2 = this.diffCommonOverlap(insertion, deletion);
                if (overlapLength1 >= overlapLength2) {
                    if (overlapLength1 >= deletion.length / 2 ||
                        overlapLength1 >= insertion.length / 2) {
                        // Overlap found.  Insert an equality and trim the surrounding edits.
                        diffs.splice( pointer, 0, [ DIFF_EQUAL, insertion.substring( 0, overlapLength1 ) ] );
                        diffs[pointer - 1][1] =
                            deletion.substring(0, deletion.length - overlapLength1);
                        diffs[pointer + 1][1] = insertion.substring(overlapLength1);
                        pointer++;
                    }
                } else {
                    if (overlapLength2 >= deletion.length / 2 ||
                        overlapLength2 >= insertion.length / 2) {
                        // Reverse overlap found.
                        // Insert an equality and swap and trim the surrounding edits.
                        diffs.splice( pointer, 0, [ DIFF_EQUAL, deletion.substring( 0, overlapLength2 ) ] );
                        diffs[pointer - 1][0] = DIFF_INSERT;
                        diffs[pointer - 1][1] =
                            insertion.substring(0, insertion.length - overlapLength2);
                        diffs[pointer + 1][0] = DIFF_DELETE;
                        diffs[pointer + 1][1] =
                            deletion.substring(overlapLength2);
                        pointer++;
                    }
                }
                pointer++;
            }
            pointer++;
        }
    };

    /**
     * Determine if the suffix of one string is the prefix of another.
     * @param {string} text1 First string.
     * @param {string} text2 Second string.
     * @return {number} The number of characters common to the end of the first
     *     string and the start of the second string.
     * @private
     */
    DiffMatchPatch.prototype.diffCommonOverlap = function(text1, text2) {
        var text1Length, text2Length, textLength,
			best, length, pattern, found;
        // Cache the text lengths to prevent multiple calls.
        text1Length = text1.length;
        text2Length = text2.length;
        // Eliminate the null case.
        if (text1Length === 0 || text2Length === 0) {
            return 0;
        }
        // Truncate the longer string.
        if (text1Length > text2Length) {
            text1 = text1.substring(text1Length - text2Length);
        } else if (text1Length < text2Length) {
            text2 = text2.substring(0, text1Length);
        }
        textLength = Math.min(text1Length, text2Length);
        // Quick check for the worst case.
        if (text1 === text2) {
            return textLength;
        }

        // Start by looking for a single character match
        // and increase length until no match is found.
        // Performance analysis: http://neil.fraser.name/news/2010/11/04/
        best = 0;
        length = 1;
        while (true) {
            pattern = text1.substring(textLength - length);
            found = text2.indexOf(pattern);
            if (found === -1) {
                return best;
            }
            length += found;
            if (found === 0 || text1.substring(textLength - length) ===
                text2.substring(0, length)) {
                best = length;
                length++;
            }
        }
    };

    /**
     * Split two texts into an array of strings.  Reduce the texts to a string of
     * hashes where each Unicode character represents one line.
     * @param {string} text1 First string.
     * @param {string} text2 Second string.
     * @return {{chars1: string, chars2: string, lineArray: !Array.<string>}}
     *     An object containing the encoded text1, the encoded text2 and
     *     the array of unique strings.
     *     The zeroth element of the array of unique strings is intentionally blank.
     * @private
     */
    DiffMatchPatch.prototype.diffLinesToChars = function(text1, text2) {
        var lineArray, lineHash, chars1, chars2;
        lineArray = []; // e.g. lineArray[4] === 'Hello\n'
        lineHash = {}; // e.g. lineHash['Hello\n'] === 4

        // '\x00' is a valid character, but various debuggers don't like it.
        // So we'll insert a junk entry to avoid generating a null character.
        lineArray[0] = "";

        /**
         * Split a text into an array of strings.  Reduce the texts to a string of
         * hashes where each Unicode character represents one line.
         * Modifies linearray and linehash through being a closure.
         * @param {string} text String to encode.
         * @return {string} Encoded string.
         * @private
         */
        function diffLinesToCharsMunge(text) {
            var chars, lineStart, lineEnd, lineArrayLength, line;
            chars = "";
            // Walk the text, pulling out a substring for each line.
            // text.split('\n') would would temporarily double our memory footprint.
            // Modifying text would create many large strings to garbage collect.
            lineStart = 0;
            lineEnd = -1;
            // Keeping our own length variable is faster than looking it up.
            lineArrayLength = lineArray.length;
            while (lineEnd < text.length - 1) {
                lineEnd = text.indexOf("\n", lineStart);
                if (lineEnd === -1) {
                    lineEnd = text.length - 1;
                }
                line = text.substring(lineStart, lineEnd + 1);
                lineStart = lineEnd + 1;

                if (lineHash.hasOwnProperty ? lineHash.hasOwnProperty(line) :
                    (lineHash[line] !== undefined)) {
                    chars += String.fromCharCode( lineHash[ line ] );
                } else {
                    chars += String.fromCharCode(lineArrayLength);
                    lineHash[line] = lineArrayLength;
                    lineArray[lineArrayLength++] = line;
                }
            }
            return chars;
        }

        chars1 = diffLinesToCharsMunge(text1);
        chars2 = diffLinesToCharsMunge(text2);
        return {
            chars1: chars1,
            chars2: chars2,
            lineArray: lineArray
        };
    };

    /**
     * Rehydrate the text in a diff from a string of line hashes to real lines of
     * text.
     * @param {!Array.<!DiffMatchPatch.Diff>} diffs Array of diff tuples.
     * @param {!Array.<string>} lineArray Array of unique strings.
     * @private
     */
    DiffMatchPatch.prototype.diffCharsToLines = function( diffs, lineArray ) {
        var x, chars, text, y;
        for ( x = 0; x < diffs.length; x++ ) {
            chars = diffs[x][1];
            text = [];
            for ( y = 0; y < chars.length; y++ ) {
                text[y] = lineArray[chars.charCodeAt(y)];
            }
            diffs[x][1] = text.join("");
        }
    };

    /**
     * Reorder and merge like edit sections.  Merge equalities.
     * Any edit section can move as long as it doesn't cross an equality.
     * @param {!Array.<!DiffMatchPatch.Diff>} diffs Array of diff tuples.
     */
    DiffMatchPatch.prototype.diffCleanupMerge = function(diffs) {
        var pointer, countDelete, countInsert, textInsert, textDelete,
			commonlength, changes;
        diffs.push( [ DIFF_EQUAL, "" ] ); // Add a dummy entry at the end.
        pointer = 0;
        countDelete = 0;
        countInsert = 0;
        textDelete = "";
        textInsert = "";
        commonlength;
        while (pointer < diffs.length) {
            switch ( diffs[ pointer ][ 0 ] ) {
                case DIFF_INSERT:
                    countInsert++;
                    textInsert += diffs[pointer][1];
                    pointer++;
                    break;
                case DIFF_DELETE:
                    countDelete++;
                    textDelete += diffs[pointer][1];
                    pointer++;
                    break;
                case DIFF_EQUAL:
                    // Upon reaching an equality, check for prior redundancies.
                    if (countDelete + countInsert > 1) {
                        if (countDelete !== 0 && countInsert !== 0) {
                            // Factor out any common prefixies.
                            commonlength = this.diffCommonPrefix(textInsert, textDelete);
                            if (commonlength !== 0) {
                                if ((pointer - countDelete - countInsert) > 0 &&
                                    diffs[pointer - countDelete - countInsert - 1][0] ===
                                    DIFF_EQUAL) {
                                    diffs[pointer - countDelete - countInsert - 1][1] +=
                                        textInsert.substring(0, commonlength);
                                } else {
                                    diffs.splice( 0, 0, [ DIFF_EQUAL,
                                        textInsert.substring( 0, commonlength )
                                     ] );
                                    pointer++;
                                }
                                textInsert = textInsert.substring(commonlength);
                                textDelete = textDelete.substring(commonlength);
                            }
                            // Factor out any common suffixies.
                            commonlength = this.diffCommonSuffix(textInsert, textDelete);
                            if (commonlength !== 0) {
                                diffs[pointer][1] = textInsert.substring(textInsert.length -
                                    commonlength) + diffs[pointer][1];
                                textInsert = textInsert.substring(0, textInsert.length -
                                    commonlength);
                                textDelete = textDelete.substring(0, textDelete.length -
                                    commonlength);
                            }
                        }
                        // Delete the offending records and add the merged ones.
                        if (countDelete === 0) {
                            diffs.splice( pointer - countInsert,
                                countDelete + countInsert, [ DIFF_INSERT, textInsert ] );
                        } else if (countInsert === 0) {
                            diffs.splice( pointer - countDelete,
                                countDelete + countInsert, [ DIFF_DELETE, textDelete ] );
                        } else {
                            diffs.splice( pointer - countDelete - countInsert,
                                countDelete + countInsert, [ DIFF_DELETE, textDelete ], [ DIFF_INSERT, textInsert ] );
                        }
                        pointer = pointer - countDelete - countInsert +
                            (countDelete ? 1 : 0) + (countInsert ? 1 : 0) + 1;
                    } else if (pointer !== 0 && diffs[pointer - 1][0] === DIFF_EQUAL) {
                        // Merge this equality with the previous one.
                        diffs[pointer - 1][1] += diffs[pointer][1];
                        diffs.splice(pointer, 1);
                    } else {
                        pointer++;
                    }
                    countInsert = 0;
                    countDelete = 0;
                    textDelete = "";
                    textInsert = "";
                    break;
            }
        }
        if (diffs[diffs.length - 1][1] === "") {
            diffs.pop(); // Remove the dummy entry at the end.
        }

        // Second pass: look for single edits surrounded on both sides by equalities
        // which can be shifted sideways to eliminate an equality.
        // e.g: A<ins>BA</ins>C -> <ins>AB</ins>AC
        changes = false;
        pointer = 1;
        // Intentionally ignore the first and last element (don't need checking).
        while (pointer < diffs.length - 1) {
            if (diffs[pointer - 1][0] === DIFF_EQUAL &&
                diffs[pointer + 1][0] === DIFF_EQUAL) {
                // This is a single edit surrounded by equalities.
                if ( diffs[ pointer ][ 1 ].substring( diffs[ pointer ][ 1 ].length -
                        diffs[ pointer - 1 ][ 1 ].length ) === diffs[ pointer - 1 ][ 1 ] ) {
                    // Shift the edit over the previous equality.
                    diffs[pointer][1] = diffs[pointer - 1][1] +
                        diffs[pointer][1].substring(0, diffs[pointer][1].length -
                            diffs[pointer - 1][1].length);
                    diffs[pointer + 1][1] = diffs[pointer - 1][1] + diffs[pointer + 1][1];
                    diffs.splice(pointer - 1, 1);
                    changes = true;
                } else if ( diffs[ pointer ][ 1 ].substring( 0, diffs[ pointer + 1 ][ 1 ].length ) ===
                    diffs[ pointer + 1 ][ 1 ] ) {
                    // Shift the edit over the next equality.
                    diffs[pointer - 1][1] += diffs[pointer + 1][1];
                    diffs[pointer][1] =
                        diffs[pointer][1].substring(diffs[pointer + 1][1].length) +
                        diffs[pointer + 1][1];
                    diffs.splice(pointer + 1, 1);
                    changes = true;
                }
            }
            pointer++;
        }
        // If shifts were made, the diff needs reordering and another shift sweep.
        if (changes) {
            this.diffCleanupMerge(diffs);
        }
    };

    return function(o, n) {
		var diff, output, text;
        diff = new DiffMatchPatch();
        output = diff.DiffMain(o, n);
        //console.log(output);
        diff.diffCleanupEfficiency(output);
        text = diff.diffPrettyHtml(output);

        return text;
    };
}());
// jscs:enable

(function() {

// Deprecated QUnit.init - Ref #530
// Re-initialize the configuration options
QUnit.init = function() {
	var tests, banner, result, qunit,
		config = QUnit.config;

	config.stats = { all: 0, bad: 0 };
	config.moduleStats = { all: 0, bad: 0 };
	config.started = 0;
	config.updateRate = 1000;
	config.blocking = false;
	config.autostart = true;
	config.autorun = false;
	config.filter = "";
	config.queue = [];

	// Return on non-browser environments
	// This is necessary to not break on node tests
	if ( typeof window === "undefined" ) {
		return;
	}

	qunit = id( "qunit" );
	if ( qunit ) {
		qunit.innerHTML =
			"<h1 id='qunit-header'>" + escapeText( document.title ) + "</h1>" +
			"<h2 id='qunit-banner'></h2>" +
			"<div id='qunit-testrunner-toolbar'></div>" +
			"<h2 id='qunit-userAgent'></h2>" +
			"<ol id='qunit-tests'></ol>";
	}

	tests = id( "qunit-tests" );
	banner = id( "qunit-banner" );
	result = id( "qunit-testresult" );

	if ( tests ) {
		tests.innerHTML = "";
	}

	if ( banner ) {
		banner.className = "";
	}

	if ( result ) {
		result.parentNode.removeChild( result );
	}

	if ( tests ) {
		result = document.createElement( "p" );
		result.id = "qunit-testresult";
		result.className = "result";
		tests.parentNode.insertBefore( result, tests );
		result.innerHTML = "Running...<br />&#160;";
	}
};

// Don't load the HTML Reporter on non-Browser environments
if ( typeof window === "undefined" ) {
	return;
}

var config = QUnit.config,
	hasOwn = Object.prototype.hasOwnProperty,
	defined = {
		document: window.document !== undefined,
		sessionStorage: (function() {
			var x = "qunit-test-string";
			try {
				sessionStorage.setItem( x, x );
				sessionStorage.removeItem( x );
				return true;
			} catch ( e ) {
				return false;
			}
		}())
	},
	modulesList = [];

/**
* Escape text for attribute or text content.
*/
function escapeText( s ) {
	if ( !s ) {
		return "";
	}
	s = s + "";

	// Both single quotes and double quotes (for attributes)
	return s.replace( /['"<>&]/g, function( s ) {
		switch ( s ) {
		case "'":
			return "&#039;";
		case "\"":
			return "&quot;";
		case "<":
			return "&lt;";
		case ">":
			return "&gt;";
		case "&":
			return "&amp;";
		}
	});
}

/**
 * @param {HTMLElement} elem
 * @param {string} type
 * @param {Function} fn
 */
function addEvent( elem, type, fn ) {
	if ( elem.addEventListener ) {

		// Standards-based browsers
		elem.addEventListener( type, fn, false );
	} else if ( elem.attachEvent ) {

		// support: IE <9
		elem.attachEvent( "on" + type, function() {
			var event = window.event;
			if ( !event.target ) {
				event.target = event.srcElement || document;
			}

			fn.call( elem, event );
		});
	}
}

/**
 * @param {Array|NodeList} elems
 * @param {string} type
 * @param {Function} fn
 */
function addEvents( elems, type, fn ) {
	var i = elems.length;
	while ( i-- ) {
		addEvent( elems[ i ], type, fn );
	}
}

function hasClass( elem, name ) {
	return ( " " + elem.className + " " ).indexOf( " " + name + " " ) >= 0;
}

function addClass( elem, name ) {
	if ( !hasClass( elem, name ) ) {
		elem.className += ( elem.className ? " " : "" ) + name;
	}
}

function toggleClass( elem, name ) {
	if ( hasClass( elem, name ) ) {
		removeClass( elem, name );
	} else {
		addClass( elem, name );
	}
}

function removeClass( elem, name ) {
	var set = " " + elem.className + " ";

	// Class name may appear multiple times
	while ( set.indexOf( " " + name + " " ) >= 0 ) {
		set = set.replace( " " + name + " ", " " );
	}

	// trim for prettiness
	elem.className = typeof set.trim === "function" ? set.trim() : set.replace( /^\s+|\s+$/g, "" );
}

function id( name ) {
	return defined.document && document.getElementById && document.getElementById( name );
}

function getUrlConfigHtml() {
	var i, j, val,
		escaped, escapedTooltip,
		selection = false,
		len = config.urlConfig.length,
		urlConfigHtml = "";

	for ( i = 0; i < len; i++ ) {
		val = config.urlConfig[ i ];
		if ( typeof val === "string" ) {
			val = {
				id: val,
				label: val
			};
		}

		escaped = escapeText( val.id );
		escapedTooltip = escapeText( val.tooltip );

		if ( config[ val.id ] === undefined ) {
			config[ val.id ] = QUnit.urlParams[ val.id ];
		}

		if ( !val.value || typeof val.value === "string" ) {
			urlConfigHtml += "<input id='qunit-urlconfig-" + escaped +
				"' name='" + escaped + "' type='checkbox'" +
				( val.value ? " value='" + escapeText( val.value ) + "'" : "" ) +
				( config[ val.id ] ? " checked='checked'" : "" ) +
				" title='" + escapedTooltip + "' /><label for='qunit-urlconfig-" + escaped +
				"' title='" + escapedTooltip + "'>" + val.label + "</label>";
		} else {
			urlConfigHtml += "<label for='qunit-urlconfig-" + escaped +
				"' title='" + escapedTooltip + "'>" + val.label +
				": </label><select id='qunit-urlconfig-" + escaped +
				"' name='" + escaped + "' title='" + escapedTooltip + "'><option></option>";

			if ( QUnit.is( "array", val.value ) ) {
				for ( j = 0; j < val.value.length; j++ ) {
					escaped = escapeText( val.value[ j ] );
					urlConfigHtml += "<option value='" + escaped + "'" +
						( config[ val.id ] === val.value[ j ] ?
							( selection = true ) && " selected='selected'" : "" ) +
						">" + escaped + "</option>";
				}
			} else {
				for ( j in val.value ) {
					if ( hasOwn.call( val.value, j ) ) {
						urlConfigHtml += "<option value='" + escapeText( j ) + "'" +
							( config[ val.id ] === j ?
								( selection = true ) && " selected='selected'" : "" ) +
							">" + escapeText( val.value[ j ] ) + "</option>";
					}
				}
			}
			if ( config[ val.id ] && !selection ) {
				escaped = escapeText( config[ val.id ] );
				urlConfigHtml += "<option value='" + escaped +
					"' selected='selected' disabled='disabled'>" + escaped + "</option>";
			}
			urlConfigHtml += "</select>";
		}
	}

	return urlConfigHtml;
}

// Handle "click" events on toolbar checkboxes and "change" for select menus.
// Updates the URL with the new state of `config.urlConfig` values.
function toolbarChanged() {
	var updatedUrl, value,
		field = this,
		params = {};

	// Detect if field is a select menu or a checkbox
	if ( "selectedIndex" in field ) {
		value = field.options[ field.selectedIndex ].value || undefined;
	} else {
		value = field.checked ? ( field.defaultValue || true ) : undefined;
	}

	params[ field.name ] = value;
	updatedUrl = setUrl( params );

	if ( "hidepassed" === field.name && "replaceState" in window.history ) {
		config[ field.name ] = value || false;
		if ( value ) {
			addClass( id( "qunit-tests" ), "hidepass" );
		} else {
			removeClass( id( "qunit-tests" ), "hidepass" );
		}

		// It is not necessary to refresh the whole page
		window.history.replaceState( null, "", updatedUrl );
	} else {
		window.location = updatedUrl;
	}
}

function setUrl( params ) {
	var key,
		querystring = "?";

	params = QUnit.extend( QUnit.extend( {}, QUnit.urlParams ), params );

	for ( key in params ) {
		if ( hasOwn.call( params, key ) ) {
			if ( params[ key ] === undefined ) {
				continue;
			}
			querystring += encodeURIComponent( key );
			if ( params[ key ] !== true ) {
				querystring += "=" + encodeURIComponent( params[ key ] );
			}
			querystring += "&";
		}
	}
	return location.protocol + "//" + location.host +
		location.pathname + querystring.slice( 0, -1 );
}

function applyUrlParams() {
	var selectedModule,
		modulesList = id( "qunit-modulefilter" ),
		filter = id( "qunit-filter-input" ).value;

	selectedModule = modulesList ?
		decodeURIComponent( modulesList.options[ modulesList.selectedIndex ].value ) :
		undefined;

	window.location = setUrl({
		module: ( selectedModule === "" ) ? undefined : selectedModule,
		filter: ( filter === "" ) ? undefined : filter,

		// Remove testId filter
		testId: undefined
	});
}

function toolbarUrlConfigContainer() {
	var urlConfigContainer = document.createElement( "span" );

	urlConfigContainer.innerHTML = getUrlConfigHtml();
	addClass( urlConfigContainer, "qunit-url-config" );

	// For oldIE support:
	// * Add handlers to the individual elements instead of the container
	// * Use "click" instead of "change" for checkboxes
	addEvents( urlConfigContainer.getElementsByTagName( "input" ), "click", toolbarChanged );
	addEvents( urlConfigContainer.getElementsByTagName( "select" ), "change", toolbarChanged );

	return urlConfigContainer;
}

function toolbarLooseFilter() {
	var filter = document.createElement( "form" ),
		label = document.createElement( "label" ),
		input = document.createElement( "input" ),
		button = document.createElement( "button" );

	addClass( filter, "qunit-filter" );

	label.innerHTML = "Filter: ";

	input.type = "text";
	input.value = config.filter || "";
	input.name = "filter";
	input.id = "qunit-filter-input";

	button.innerHTML = "Go";

	label.appendChild( input );

	filter.appendChild( label );
	filter.appendChild( button );
	addEvent( filter, "submit", function( ev ) {
		applyUrlParams();

		if ( ev && ev.preventDefault ) {
			ev.preventDefault();
		}

		return false;
	});

	return filter;
}

function toolbarModuleFilterHtml() {
	var i,
		moduleFilterHtml = "";

	if ( !modulesList.length ) {
		return false;
	}

	modulesList.sort(function( a, b ) {
		return a.localeCompare( b );
	});

	moduleFilterHtml += "<label for='qunit-modulefilter'>Module: </label>" +
		"<select id='qunit-modulefilter' name='modulefilter'><option value='' " +
		( QUnit.urlParams.module === undefined ? "selected='selected'" : "" ) +
		">< All Modules ></option>";

	for ( i = 0; i < modulesList.length; i++ ) {
		moduleFilterHtml += "<option value='" +
			escapeText( encodeURIComponent( modulesList[ i ] ) ) + "' " +
			( QUnit.urlParams.module === modulesList[ i ] ? "selected='selected'" : "" ) +
			">" + escapeText( modulesList[ i ] ) + "</option>";
	}
	moduleFilterHtml += "</select>";

	return moduleFilterHtml;
}

function toolbarModuleFilter() {
	var toolbar = id( "qunit-testrunner-toolbar" ),
		moduleFilter = document.createElement( "span" ),
		moduleFilterHtml = toolbarModuleFilterHtml();

	if ( !toolbar || !moduleFilterHtml ) {
		return false;
	}

	moduleFilter.setAttribute( "id", "qunit-modulefilter-container" );
	moduleFilter.innerHTML = moduleFilterHtml;

	addEvent( moduleFilter.lastChild, "change", applyUrlParams );

	toolbar.appendChild( moduleFilter );
}

function appendToolbar() {
	var toolbar = id( "qunit-testrunner-toolbar" );

	if ( toolbar ) {
		toolbar.appendChild( toolbarUrlConfigContainer() );
		toolbar.appendChild( toolbarLooseFilter() );
	}
}

function appendHeader() {
	var header = id( "qunit-header" );

	if ( header ) {
		header.innerHTML = "<a href='" +
			setUrl({ filter: undefined, module: undefined, testId: undefined }) +
			"'>" + header.innerHTML + "</a> ";
	}
}

function appendBanner() {
	var banner = id( "qunit-banner" );

	if ( banner ) {
		banner.className = "";
	}
}

function appendTestResults() {
	var tests = id( "qunit-tests" ),
		result = id( "qunit-testresult" );

	if ( result ) {
		result.parentNode.removeChild( result );
	}

	if ( tests ) {
		tests.innerHTML = "";
		result = document.createElement( "p" );
		result.id = "qunit-testresult";
		result.className = "result";
		tests.parentNode.insertBefore( result, tests );
		result.innerHTML = "Running...<br />&#160;";
	}
}

function storeFixture() {
	var fixture = id( "qunit-fixture" );
	if ( fixture ) {
		config.fixture = fixture.innerHTML;
	}
}

function appendUserAgent() {
	var userAgent = id( "qunit-userAgent" );

	if ( userAgent ) {
		userAgent.innerHTML = "";
		userAgent.appendChild(
			document.createTextNode(
				"QUnit " + QUnit.version  + "; " + navigator.userAgent
			)
		);
	}
}

function appendTestsList( modules ) {
	var i, l, x, z, test, moduleObj;

	for ( i = 0, l = modules.length; i < l; i++ ) {
		moduleObj = modules[ i ];

		if ( moduleObj.name ) {
			modulesList.push( moduleObj.name );
		}

		for ( x = 0, z = moduleObj.tests.length; x < z; x++ ) {
			test = moduleObj.tests[ x ];

			appendTest( test.name, test.testId, moduleObj.name );
		}
	}
}

function appendTest( name, testId, moduleName ) {
	var title, rerunTrigger, testBlock, assertList,
		tests = id( "qunit-tests" );

	if ( !tests ) {
		return;
	}

	title = document.createElement( "strong" );
	title.innerHTML = getNameHtml( name, moduleName );

	rerunTrigger = document.createElement( "a" );
	rerunTrigger.innerHTML = "Rerun";
	rerunTrigger.href = setUrl({ testId: testId });

	testBlock = document.createElement( "li" );
	testBlock.appendChild( title );
	testBlock.appendChild( rerunTrigger );
	testBlock.id = "qunit-test-output-" + testId;

	assertList = document.createElement( "ol" );
	assertList.className = "qunit-assert-list";

	testBlock.appendChild( assertList );

	tests.appendChild( testBlock );
}

// HTML Reporter initialization and load
QUnit.begin(function( details ) {
	var qunit = id( "qunit" );

	// Fixture is the only one necessary to run without the #qunit element
	storeFixture();

	if ( qunit ) {
		qunit.innerHTML =
			"<h1 id='qunit-header'>" + escapeText( document.title ) + "</h1>" +
			"<h2 id='qunit-banner'></h2>" +
			"<div id='qunit-testrunner-toolbar'></div>" +
			"<h2 id='qunit-userAgent'></h2>" +
			"<ol id='qunit-tests'></ol>";
	}

	appendHeader();
	appendBanner();
	appendTestResults();
	appendUserAgent();
	appendToolbar();
	appendTestsList( details.modules );
	toolbarModuleFilter();

	if ( qunit && config.hidepassed ) {
		addClass( qunit.lastChild, "hidepass" );
	}
});

QUnit.done(function( details ) {
	var i, key,
		banner = id( "qunit-banner" ),
		tests = id( "qunit-tests" ),
		html = [
			"Tests completed in ",
			details.runtime,
			" milliseconds.<br />",
			"<span class='passed'>",
			details.passed,
			"</span> assertions of <span class='total'>",
			details.total,
			"</span> passed, <span class='failed'>",
			details.failed,
			"</span> failed."
		].join( "" );

	if ( banner ) {
		banner.className = details.failed ? "qunit-fail" : "qunit-pass";
	}

	if ( tests ) {
		id( "qunit-testresult" ).innerHTML = html;
	}

	if ( config.altertitle && defined.document && document.title ) {

		// show ✖ for good, ✔ for bad suite result in title
		// use escape sequences in case file gets loaded with non-utf-8-charset
		document.title = [
			( details.failed ? "\u2716" : "\u2714" ),
			document.title.replace( /^[\u2714\u2716] /i, "" )
		].join( " " );
	}

	// clear own sessionStorage items if all tests passed
	if ( config.reorder && defined.sessionStorage && details.failed === 0 ) {
		for ( i = 0; i < sessionStorage.length; i++ ) {
			key = sessionStorage.key( i++ );
			if ( key.indexOf( "qunit-test-" ) === 0 ) {
				sessionStorage.removeItem( key );
			}
		}
	}

	// scroll back to top to show results
	if ( config.scrolltop && window.scrollTo ) {
		window.scrollTo( 0, 0 );
	}
});

function getNameHtml( name, module ) {
	var nameHtml = "";

	if ( module ) {
		nameHtml = "<span class='module-name'>" + escapeText( module ) + "</span>: ";
	}

	nameHtml += "<span class='test-name'>" + escapeText( name ) + "</span>";

	return nameHtml;
}

QUnit.testStart(function( details ) {
	var running, testBlock, bad;

	testBlock = id( "qunit-test-output-" + details.testId );
	if ( testBlock ) {
		testBlock.className = "running";
	} else {

		// Report later registered tests
		appendTest( details.name, details.testId, details.module );
	}

	running = id( "qunit-testresult" );
	if ( running ) {
		bad = QUnit.config.reorder && defined.sessionStorage &&
			+sessionStorage.getItem( "qunit-test-" + details.module + "-" + details.name );

		running.innerHTML = ( bad ?
			"Rerunning previously failed test: <br />" :
			"Running: <br />" ) +
			getNameHtml( details.name, details.module );
	}

});

QUnit.log(function( details ) {
	var assertList, assertLi,
		message, expected, actual,
		testItem = id( "qunit-test-output-" + details.testId );

	if ( !testItem ) {
		return;
	}

	message = escapeText( details.message ) || ( details.result ? "okay" : "failed" );
	message = "<span class='test-message'>" + message + "</span>";
	message += "<span class='runtime'>@ " + details.runtime + " ms</span>";

	// pushFailure doesn't provide details.expected
	// when it calls, it's implicit to also not show expected and diff stuff
	// Also, we need to check details.expected existence, as it can exist and be undefined
	if ( !details.result && hasOwn.call( details, "expected" ) ) {
		expected = escapeText( QUnit.dump.parse( details.expected ) );
		actual = escapeText( QUnit.dump.parse( details.actual ) );
		message += "<table><tr class='test-expected'><th>Expected: </th><td><pre>" +
			expected +
			"</pre></td></tr>";

		if ( actual !== expected ) {
			message += "<tr class='test-actual'><th>Result: </th><td><pre>" +
				actual + "</pre></td></tr>" +
				"<tr class='test-diff'><th>Diff: </th><td><pre>" +
				QUnit.diff( expected, actual ) + "</pre></td></tr>";
		} else {
			if ( expected.indexOf( "[object Array]" ) !== -1 ||
					expected.indexOf( "[object Object]" ) !== -1 ) {
				message += "<tr class='test-message'><th>Message: </th><td>" +
					"Diff suppressed as the depth of object is more than current max depth (" +
					QUnit.config.maxDepth + ").<p>Hint: Use <code>QUnit.dump.maxDepth</code> to " +
					" run with a higher max depth or <a href='" + setUrl({ maxDepth: -1 }) + "'>" +
					"Rerun</a> without max depth.</p></td></tr>";
			}
		}

		if ( details.source ) {
			message += "<tr class='test-source'><th>Source: </th><td><pre>" +
				escapeText( details.source ) + "</pre></td></tr>";
		}

		message += "</table>";

	// this occours when pushFailure is set and we have an extracted stack trace
	} else if ( !details.result && details.source ) {
		message += "<table>" +
			"<tr class='test-source'><th>Source: </th><td><pre>" +
			escapeText( details.source ) + "</pre></td></tr>" +
			"</table>";
	}

	assertList = testItem.getElementsByTagName( "ol" )[ 0 ];

	assertLi = document.createElement( "li" );
	assertLi.className = details.result ? "pass" : "fail";
	assertLi.innerHTML = message;
	assertList.appendChild( assertLi );
});

QUnit.testDone(function( details ) {
	var testTitle, time, testItem, assertList,
		good, bad, testCounts, skipped,
		tests = id( "qunit-tests" );

	if ( !tests ) {
		return;
	}

	testItem = id( "qunit-test-output-" + details.testId );

	assertList = testItem.getElementsByTagName( "ol" )[ 0 ];

	good = details.passed;
	bad = details.failed;

	// store result when possible
	if ( config.reorder && defined.sessionStorage ) {
		if ( bad ) {
			sessionStorage.setItem( "qunit-test-" + details.module + "-" + details.name, bad );
		} else {
			sessionStorage.removeItem( "qunit-test-" + details.module + "-" + details.name );
		}
	}

	if ( bad === 0 ) {
		addClass( assertList, "qunit-collapsed" );
	}

	// testItem.firstChild is the test name
	testTitle = testItem.firstChild;

	testCounts = bad ?
		"<b class='failed'>" + bad + "</b>, " + "<b class='passed'>" + good + "</b>, " :
		"";

	testTitle.innerHTML += " <b class='counts'>(" + testCounts +
		details.assertions.length + ")</b>";

	if ( details.skipped ) {
		testItem.className = "skipped";
		skipped = document.createElement( "em" );
		skipped.className = "qunit-skipped-label";
		skipped.innerHTML = "skipped";
		testItem.insertBefore( skipped, testTitle );
	} else {
		addEvent( testTitle, "click", function() {
			toggleClass( assertList, "qunit-collapsed" );
		});

		testItem.className = bad ? "fail" : "pass";

		time = document.createElement( "span" );
		time.className = "runtime";
		time.innerHTML = details.runtime + " ms";
		testItem.insertBefore( time, assertList );
	}
});

if ( defined.document ) {
	if ( document.readyState === "complete" ) {
		QUnit.load();
	} else {
		addEvent( window, "load", QUnit.load );
	}
} else {
	config.pageLoaded = true;
	config.autorun = true;
}

})();
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  $!43�,.������Bv�m
�u�
� ��wfኾ�z�=o=[�9O�:����3�5���˅h(J���������,&�����Lc�+�RO��~�V������H�?/m\������ئ&����u_)i��G>�)ָJ}�����[gQ{���a�M!�v��3���]o�-�-	��I�8�~�F0`�\���B��̓��Lµ'tH8}� n���xS/��.��"-�R]�3�J���;4g
R���8Η�}ALy��:{D���P����ϧ�NQ�8���*�F��U����+5����f�r5�cۍ)�9��Ħ����(~Q��DB �_��$7t\�遾+��1����d�>��=Gٷ��{#��Sŧ)sgڿq́�D�s�I�i�4"�~zz�?vwP��s u��я��
�:��p6w�����*q���!�g�1�U�J�ٯ��W~�bg2�x�MN��������@�l�Ef��G1��A[4qɄK�V��4�θ�v���5}��89���i
.�c�����#-YCZ��H�$7�*n���L�֓����������D廤�+����sgS\��3��+���b���ҷ���@O�5�/o�0��!]H��B4�AQ��9�,�K��yQ�Ӻi�j�����VL�~�v��
#�w���w��0F]��@
G��U�1�i/���a�*�j"�n\e�kBrV�D�?O3��<.o�O6�%���L��RG�Ȏ�?^FS�ǆ5���
�����1%v7�Y�.T22�@�~��U=�%��6�a����6�{�]h��\���p�O������"@����82ذ3���CI�a���cS��L�56�cL���`-�W�����ӻAY��C����;L;�j�˗�^+��?��ؖ
`$��C�!��t^I�"�Uv��	՝�h*�p��u��%�e�����A�vFq��8��B<�����E8��
�c��5!֒�{<����]=G�ڽ�*ʨG��_�JZ�͑�0��{{�f�[�IS�����v4G	�3��&c�|�Q�ો����b/e�{f�+�mН���7�*�h�`�������\�C� }�����@ڣO��Ԙ���ʪ��l3�/��X�ޘn � 4����o�Ĵ"b�\,U���t�t�EA����צo��RrQ���j����6ٮ%�}��$�8m�$���1͛�l`�!���PN6t!ۑ" �� ��`�8r�L�մ��÷�
�e���W�捙�u�A~ݵ�����ͺI�&1���y������\P��SaǼ8=��Z��C{3��0�Y�����Mz���f�ZbD�X:Ut�=6�/E���a�:yfB�C(��V�s �\*=�{��ic-��Xۤqmֶ��KC�̛�b��pխ}6�w��{돫����D���]��Q�J�]l�YV�	'9[�v�^�Vws%��v��(7�A�+��ܾTԜ,TO噑�a]ӆٽ�|�.�}F	�#F��@_�eQ	��/Sv� �9)tf}:��Ӱ�q�DPL�����Z�v@
��#�'�8�לv���Y��o����4�]���ݞ|����UF�3��8\��;}�9x�sVk̈́�k߇�y��X�� d�B�-x*v
Ӷ� J��gD�I1��a�6�oNU�@���d��<��U���	�CpsD��x�mS��K�pL'��^�u���]�����P�p����(d��Z�����*Sr���.�/�s*�TGL���|��2�Fc�3�ؠo��IqT[������CL&�T�PU�cF�Š�@<�� �����n���8i�B�v�b-z@�0��
�=n\/���YW��s��J�o����w�,�(I��êT���6��%>ݶ9�aЊ��XʰEn��N���ܙa�$���h����h�s}*��� �@�l8q���d�iU!��0�W�$;��\��b}�L�]|��8�	��Y���?KQ�[�V�F��ξˆT��93�(~�-X�JQ9~����z����#�����h�Õpn6(��v��k�#�#i$Cu������k!�ujVl�䒯]M*��N���z�ѫ-������3��n�(�� 'MN��H{z���4#JJ'�	�������	@#Uj��`�˰�U�+��U����"�+
A����6�G���ܽ�ީ�ݿC�w3rט)�d�/�� 'l�)a���~�N��/������T��x���q�ТA��@y��+��Y�����'�TPd���{
~�^d��;��K;U�dk(EJ��<];�
� #����[G�3�[���'�Ҵ�M��&a�8�9����
}0䒥ؕb���E���h��ц�ʰ_�e:�]P/}鵃��\;X5�����i8y%��N��o,b6��IY���x��Z��l m4y��^f��f覭�j���Y��3��j���:���Kqa�J��%��ݯ��M67"�&�ߏ�Z#���>���o�(��.7��?�a�;qgu�4<�q$�?�1�@�*��ZIWM_E���ED�3[���7�?':C�Cz��ؗކ��	pͩ�I�[�S�cA�L\�#ƆG:��Q���&�}@wcMֽ�R#�)K
���{��jo@KJ��A*����11I58g��#��<�7�N��9Yk���E҉��O���l�%������M�n䮕�q�HqG;?�g �ՠAс��]C0ޔ�&�Չw�����UwiR8���Q#`�w�?�]^��z��1 }˙\���4�IJT
�CJ�'��Zbߚ�a��9�_�P
��d #2����:��x�C�b(�:�@W��qgÊ�t�k�w棠�x}���=9 p��Q�7r;��F3�z�ɭ��*�$f1��ࢋȸ�c��1٫��"� "�v+8y��K
�'	�I�=�b��@7�6qؒ�KQ���uf�p�j	�
�m*J��W�&�"�kP|`k\�5�):�J��	x��L�����["���q*]�Ճ��f(W��Y<� "T��;O�*��Z�.c'�QIo���Wp��X]߾�ķ���uB����V�9R�[�%��ٗ��lK]��F�v���m�p���^7��o'��{��
=M!�x^��<�ޢ�%��@��ޤ�l�^v�fU0��0���˵�z�$����߂�C=��їX����l�c@3x�(&��d��אKl�TK�+B D8=[����}��M�ѹ(:UwN\iV3X�G�b��e%Q�#�|�˾��(Q1񗬨w�D�1ho2����xj/\�ޞ�D!ʝU�?������t4mP-��F�˯�E�_�a�@��[Y-}�>�h=�2�&y��̺����i�����r�D���a(��D)XAbQ%�� RC¥�,��}c���H��.5(h �i�D�:Ϳ3~W4�x}��tS!#�J��=}-"��3v�Yu)�t�e���h�5e�G iJ|8v���Cܘ�4Z&:��+�)7��D�����c�˜�5 ���m~�S��9�x�w���q[v�"t��1a�+k|����ڻ�o���\�g��Ww�S��nt���Q�Y�\��#g���u�y���㾙9:BK�>�㝠�}���.��5�Y�DAm=�m�:X,��|�׈/<�3Q!�HU.^ϳ�/pѹ����?H�
b��RNS�o70��N���J������Urv�-�Ǭ��艸t���%S]ܱ:������NeO}+�^�8yg��Ǥ,�'
���\�%��(U��t�nu� ��<�Hc���-���^���ۡu�K���T��$���/��ے�p��:�y3ʟo����u��Ҁpx�u*gQ{f��/�@t�P��`3mq�����2�������§"��ި�C�����c��3�N��77���%�(��ݔ�����h�笒��dj�{K8_X�"�5���^q/����<ɥy``��h����2��qy����{sT*m�x���=��EF���X��,��I�	ڜ���.��g	�%P�
E�#/�6���*�(Lvv�M�|��jЈB`��N� q�no���"�'$�rk�U�*� �s�\[�!��I��{�4K��
��<�ב�"���	�����P�O�b�s���=u�ؐ��&m��wc�
��Ԃݕ�hPS��(�v!	��G�[e$ߪ��F�W&���mh���u�>�1�u�P,��S	a�i!T�il.@���i��Zf�T�0 X?�3X'�J_D��� 3��#��;�͉|fapC��%��������k�]Gn7�v�jV��7�,]����s��w��x�F�q����Q���8ʎ`�i[Gw������	n5JˎI �n9��ǲ����y�%����c\����r>T��h橔���x9��'r����&�A��5� ^��R;����Ԥ&���̷�����GU�;��!����:\}�7��Fm���Q�Ĳs�;c�����_2�P����������]%|���٩��G�,@�N���<����~ zĬm�����`���X�-A�%I�x��Zةj.�s^������O=�8rJ�u��+�,�ؒ�M����_�M���4�����Ɋs�*s��\�pY"?�s��	������j�g}҆�O���m�P� �<$
Z����L�m��4�9�.�����
04�զ�H���h��KJr�z!g��+劗Պ��|��Z�T�k�-����r��<g�	��Ni��E�P��D�	�(���S�SS���܈�����B�q�j�?9���T7��oU�F���u	�؄�q =2.��iݢ��H�xmL�����$P�ߦ_��}�-����Vb�$*ZA�r��K=:k:�0jwl�1���������rq��O��Q�5�5J�Z����!�����b��q�aޕ
��`
�1��;�o��N��9!�U��y"9��+{%�Ts�m�=)�NZ��\D�bϳ�P�!D��i~�4��7��Ռ�4=O�B]��~��K.H���v�xݺ�7	��t5P�?Uy|��|�߼�vq�A���Eo=�����bu$g�YR��X���!�9m�N��A͂�6�7SUJ����PeQ�%�U?1AP��к��=<�j�@���u��ุ��s�,F�����e�!zO������r��[/Q��}��y$qp��^��l��`;F��N����Q{��栠%8 Y{9>
�YB �(W	;@�1�Ў{~�&���r�}]����9���L�+m��O
>B������D4+ y�8�*b/In�nl�ǖ7�Du�A�a�k��n�`���B$K�Ʊ螟�?��<��)�ʅ�D��*�G��XMnӆS� �)v߂p"���Ҥ�-�A�(��L�v̫�m��*��N��,����`�p��N���:���c��/�2\�5���
֡�2�
��d�d��L����P���<Q4Qꥴ(+���si�Ӷ��y��iQvR�\���ç>TGkq�t��|��(�p컟�J��]pT-�T�����Js���-E,h�����m��.�$0�������D8y������4�0�ѐw1YjXa�/
�'���/7X6J"�B1���D�p��V�R����$xg�-����.�� �R\��`�I-�ˣ�&�6����zt_F�6Y:̉dd�J�g��ꊛ4�:�㿹
L�������Mˎ�=�흖�#���O�v�����;���N ���}�k0�_ND�+�߻��#�?:����Z-+���d�R�V=E[=�{7`o$�r�=������|��G�ݤt�MW�̱薠���6�w��h�$4����V��{s�2�����3���jw1W�]p�D�>īD!7J�@�3B@��=���P��D�0�YW�R�	�3m�ko�7);��F�3l����U����/G��zi!$�K?jD��
���z�p������?��,�R���O����j��>�����%¿u����˨��G<`w�U.�0�,x��x;It�o(p�S-QK�ؑ{G�<��|<aZ.W���K�X݄�J���5��F2#Y|�&���@:�����\�?���t&����޲���3�)�-���؁X�P���?钞Du�dA2:�c\/�̛�"t_����t�M��}�9,]��d׊q�S�4 ���9���Y��z�4����*$)U"r����`��գ�8�� ���%���n��t�(��D0s��>���)���r@`؂gy��PuE�+Z���aZ��fֵ�?Q�*���6<e�, N�d.��
b"J�>��y��b
탢Z�G����0��*=G#�l��n(�2֙4Ǒy�����zU�=2+�2��}��)/ik�t%����N�ORPFK���,��9���H$��i���4�u���U�TY�n"�������|S��|ƶ��Z��5�HJ"D(u]��?���k+�
.�P��B�"���.���U:(nӲ���݈�^�`�.�f!e���vYB��~���y�%0j�O2N���I,�C�p�m_ߜƍ������e�zU!��}ڷ͸��,���I�|\�ܽ,Ⱦ�͌��
�X�r���3�L+�����4|_dϭM/��ێ�bf/�����x��#��Z��7
�d �`��qD8@���#MǸ���G�h-�S�I@���+(�x|�������� U����k�I���?�b��G�cB4߈���)��-�SW����}X�l�l�~���^�� 0Xcг\"Nr�s�bOm��vV*�f��������i'ar�Ty���������VK����ھ��u��wt|��.(�kO�F������kс=�
.� �&я|�}�#��iY��K�U��~�ΤY�p}����L�?�Hp�t�d��
Ϲ��.����Fp�ރ�[V���n���ѹ�d $/l�>*�B��Ơ r��wԑ�6Ҳ[���KW�zhʚ11��f�!dޫ���HВ뼌Uy�};+֣�cNW6�9
���<Amw	������`�G�����[�:lxۮ��"ά�1Vxwg
����!ԇ�L�(�]ʥX��:��˧O5!���2
����Q���������u�?�[��-3��o���%XZUp�{z[�%g���މ��X�S��<+B�_~�]Ͷ�~L<=hl�f��/(��e��߼>+�
�:\�ٙ�"H�T^���^~yu���
pV�=C�Wb��š���G�Y���!e$����d�V�Sa���F4S����U� ����Z �۹,�x����`�Ii���^�����֗��2�v3>����+Xʫ�]B�ü����7(�5=
 ���*��H��7}H|"����4oȐ��9bA//��9�q١�y��t��0��U	�
\�f��zT�[%;�&]>@�p�>e�^�n���ep�40*��m�h#Q�+OVrр��I � ���I�wp��
�f�0�b���#�-A� �x��2H�|/�^��B���ׂm�`$�g� ��+�쉔g�sz-Q����E�ؽ_�<�zk&�ؽ�� �(����T���"<����I ��v�xb`(�.̆3��<fP�?���tS�2݈��g/'j�����s�#O�*7Q\
��
���Fq	gIg�V
��p��ea?X
Ǫ�r��
��|*3_����3u"��z�x]>Y���`Na.���� ��S+�F����{��ך��.�'��� 7BF%����Q���E&C��I�����#mH��X�����W���SY�&��G�!u�.��B-��}����:
A寴��wF}�agџ�I�e�F4(p���D�:�d���*�bՏ�3�4z��� �!R<����v��e:�a�&���o�e�t��Ұ��Z��͉G\�
�g���n#��)<0ՈJrkִ�I��J
�Nϯ
�Y�]{8�S��é�z�[��l�圐�R[ٖ�
�k��=:>�+��Q��k_l�s�8�h�(�$�u�n�91B�L��a�]>DDzh���5ڧ�yx4�Z��B��P�t�گ�g�f���Ǚ���D�퐨��x'1�����>D��%�K؈�{�,�|�$�O��A���sl��0���e�G��Y�9y-}��Q�Њ�A:��Y�l�~ ۀ��0ka�ȑ
ˁm��n�ܬ��
bs|8�G�}�3�'dħ��Q�呃��>�2U&2RvY�m�i��%���+��[��A����%0�v-]�S�4���&�
���-��	?��1��t��Lң�5�*/HȹPzM1 %���f��G*�0W���/�Pr]��PzܗI��5��	6�lKxX��7�pkW�SO���\��zf;H��"��Yc��,��N}���C\�OI��X����?#���E��2�X��I� ǁQcP��w��	���,�b����xg�0#�; T?��?�[������әg3Z�=��S�H����E"!�k�楑��h�<��x %�@��ߗx��{٬ȕ��m��+��e]�`��,�G�p�4���4Ӆ�@yK�F�,/D������j�z��$�;v��j�s���g�˼��X��-�����ɇP}����i�b𬿖�B���`6��B�c��G([Б�	�m(��]زh�lK�Б�*���7��tf����k���Q*�˱���Gy�ʾ`��� ~��p�:�39s	�Q�J��FT��#ʿj��%�G�W�$��6m��<)��{K��md+���Bۗ�'�;3�c��Q=�DB1��e����#����SW�w��E�)>۟;�!?���<,���1�m*Y��%Ż^&�'E��Xl'�?�1~�!�<7}8�dx��zFkEmc�t���X���A��ی>����[��lؓR^~�6��I�t0u����5�������_����v�)gzz����v�띠h�qn�/�	#^x���
]�O����:^i�G�<��;U>��"?*�F���s���0Q��(*o_�bmU�\>[?����l�YD�*������]�����R�Xm��*�x����U�������=UT�i,(�G%�9��i��zN��Yf�T��P��]�Ѝ��NL��Z���Ĭ�{�3䍜iQ5�ˎKa*vr �@��#I����t�^Uр�L�
H�c�51�	����"������]�#7��ڊ��
'Ȝ�`���%��� %��X$��8v��po�7|S
�JM�#VJ���pGP���"��a)DL��t�N���y�����K�����4�vI�y�5�l��kE`�������l������wA����A�2�����2=A�bup��5S�a(���3@��;za�k�ږ_U'%J+��|<��l��=�������<cka��ȕ�������	͗/�e��E����D(�E`k��%_PP}d[(]�V�N��أ��.@��h�ȨF������Ҹ4 $yw�����臛�k}C\@M;�rF�������q Hk�I?P[�+��0fC�`گuTvP�6�$�\����>��_�~���^�1�H��r��ް�iu�v1����~]����:��B�꺋:��6����Ī	ŶH��+H���;��S�2����\�J�+�mV�j��e�F0�۴��=33�}UƇU�Ai�q6E<�!�oc9kA]B08�4[}L�U�do�qޭ��O ����"��>G�o��8C.�>�����+ڃd1.o�(�|�֓��#��?v�sy� ��p�՛���А�%�2�t\�J�wyf�#I_���	�m�������E�j��O�����Yo���O
�?��O�U��2�<��Փ�ݷ,�Wܩ�9�L��S/0n�w��T�J;y��
�;B�'`��J>���:E�����}&��r��(pҁ/P�c4#7���?��TB�,�s��6
����wd�H����in�N�]�WRw����;,5-18�LK�[�p
2ڨ z�AR�(�M$7��=ߘ�ʁڷ�������sz�]B�On++�	s�\�R�	�\�6�k�cު.XbF�*���$6b�ڠ�F������Н�Z�U�˶�OG�l�xn�ͽ����dBֺ}����2����4r�O��j`�ܽʿhe��d"��� �Li�a�eF���Ѝ��Y'9�ɦq��y�F����BY�D�EY���	Tn��z�թ�(e�w]B�;���V��^�%,��Uϭ�H�h�mml�����c�_a�%A�k� �?�<�i��\C��u�Ӆ@_C���5#:�jb���$"7��!�9���#M���Y"�{!����Q��}��"`���_V�UQPi���B��ӏG���&s0N�r@�̪p%�`�������!�B���1��؛��9|�l��>|��!�-kE�ȩ?H�|���B]�d���ڠ��J�L`�1�� CV�`x�Y����fFq�ܥeI:��|���k�\[�>Y���8��w����hjY�a-H�1�x٢��5B�^��#hW�� �~��BvK�n����&�-���.�,n�A��rg�K��Pe8��
6�j�=��!�%q�]�3�NBo�0~�s'���Tr�}��׮:N�%󅒐k�9R:pD���$�	ʙ�h	>K�{�x?�]u��DA�v��!:Rے�QI�����9n�vWr��CC����9��:���ScnL��t���H�s���(����r%���Y�C�^�e9�����
Wv���I�����ӸV�+'��	���D�j�$P�w�P@��|E( �^F�F��c�2�e�t����D�G�~��Il��|��JE�x����*���G&����#q?��v?�e���V��ޚ�B�^������p'Av�>�S"��v��ڗ�z�..���{e�d?Y
zx�8��^�1�,��
�[��v/�J
�zxh�q�k�^tZ�}���������W-ۖ7cd@d(n�,�mt���_
9��,cC������K��V�F*7�m����*$:��\���X3I��
���tV�-X�Y}1��hs]�O���R֣�"�a��ED��p���0of�E 	�OnC�Pʪ���\�	2t�n��[���\C����|\��������3�D������A����?�F�RL�q��oy��q�#��dox���E�D:r��=Qo.��f�e��F�,���?:��e81�k�{����M����B)�\pk�"�(��C��O��S��Á�L���eQ:0H�	s@�ǡAi19!��3��^/j�Z5.F���L]Έ��F�8�p��^�j�y�b�I��ݑG�Fz�e�l��7� ��`�[�o�k�;Z!�x���x�^4-atk���L{A!�V�]���e��t_������*L-�O��b(6�Z��ǹ�u8��b<;�Ә�]DR�Hm��Tb>�Yw�"�~,vR��������:����+t"d
�Z�D����2沞��Ǩ�O��F؀h�S�Z���/腕�[�&z��⾤���Ҥ���%$]X�v#����v�=�'��;�
�͓�!�� �;BA���r���.�%�
o��3
*041�Ƨ�®M����������6�\<'�zN�ΨI��,K܇��4C���S$��G	 ˟y�PD��X��=\�|���Jv�z
�m$ve�cK�	K�.7٬�TEx�A���mB�=ΡUǟ*�d�K0P\�c�y�x��g1z�_bbCx��|U�
%���,��P��f��˂�?¤E2����L��M-2�odyԦ�X�ܬv g����Ĝ����2��)y[�O�}�-_[PӪ;�:��'1�La}��~5z�=Ҁe�G5q�y�1����`���Hg����t*�B-�-��U_�L9�H���֢�Q*[�rA��+z�
WHmB������}��fI�<�Qk�%m�	nx+,2z�"�O�IU������0���}�ZY���c���/k/�m�q9Yh��"�������AǚI��UT "�Ą�����W��d��S$����M}�S�_6ؒ�[m��Mx��8Ƶ�q10iՙĢ2ܑ9��ү���I�-����C�=���v�}%%do� ��O�*#-J.J�c%�#�S��q�3�����P����<�4����3-�Lo�]Jr�OVW���	z�L��V�����*~9��"�!��~�Q��s�a���88��lI�'B2�r���:�䌤a~�>Ӷ'<��;���ح�|,@����"��7��G[Qc��$���>.�(���-R���j����B�0��=[��r{/7L�"�n����mV���>�t�1���s�pld��Q{g��}��8�i�`z�!�GV�6(��?�.-�D�~��w6��R;4�R��?�c�.�E��
:1'�q�Y~�#Gu��<�T��g����*���^�Cz ��R$���<p��:0���f�:�3xk�fn�:]чk��іn��:º� "�kf��z���[)P|P��n�6��1.�z�X���H�=G�����8���V<��úb��5���֡=SCd�;,B�<����1rc���' ��9�����7��tk���e�	�][H�>ܜwԿ����zN��A�?����g��V��͒������m� �P �ޟ)w|��"yh0^����oE1'�j�s=�E����idP�
;>�S�ۂ�Zdż<@侍D�&w�`��t7�X����H��IU��fl�}L���S�?M�Qla%N�&_��ffɌ���8%�LB�:*���]��AV�� i	�sL�y���:3����  !�A�!<K��p�i8
/`u��ߙ������1 Ñ��H�g��B����Ը����#_�2��[?v #7�����F$�/�H�w����}���*ɕ�:�f�G�Q������e�}Pf;�斟�>�gW_�w���.�̀5�0/2�"r�ASQ��%�.��**P��B�?��·d��\�jQ���!Ou�A�IYI%��W��_����w�Efa~��
T(�I��FQE\x���-�ۨtmh����_�9cp�J��O�vWĚ�dڷ$e�RZ�u>$��:`l{Ƽ�0c���M�ɼ�-���
�8< ��b�*&jcy�mE�[<�:��W
�ڂ`}}�6���&�t�+�
��Hf���"$�4(�xe�b�a����Uc�4���gwߦz�q1�Ṯ�N�0�k���Pe�o-W/Ҿ�W�s9��
?��-�]|-Y�;B��|��7"��O�V�R�
ϴs[@�(���$��Lw��zϝ�"y�Z�E6�RqD�U(^���k���,ug�d�OWʓ���>��a���l�r��'�����SD�6���*W@a��,�6}��z~ 
���)��8��1��sH:��՟�ǁ����MR�pW2��X̞.���n����2�<����,��`>J
��S|/��DIO�X������Fγ�-��9y`��p̈́C9sS�k��:����u@����E�:#NN䏚����$
��ʅ�|V���79��ca�'%⌷�%^�u!'	�-��:��V��LB
֑c��Iҳ�C5>�3*_��C��7KnB���c��o�㕩�j���%�j��"n�!�f�i��uc�.��/�v9v��Z�J5�~[Š��p��_�QA�W�ŕ+��_��s�������>j=���!@���I.�zxPw�v�7Z��� ���g���D;���O0���7�S��Jc����������Y��Q~dc1�5Rm4�v�.��m��|�V�x
���⻯���	e5I�Za&r��H��*�u� &"v��*a�ػ�.�?��eVeؚ;���%Ɨ���
}�q6��Ҥf�)��G��N�-�Tu�Z*i)�ei��R��O2�o��{�5����R��ȞK����2 �Ska��C"3������9{Ū��z�y���\�{����E��B黊�P��4DY�����6셶L�s��Z��x�ղ|٧��PƊ ?�ү�G��`.3��w)Y^~�Ư��P�� � ���� %k�!QȤ���A�g������5��M}P$�:u�g\���$q��Q�<Go�1�%F�v2DR�y��V�2��9;+���0�8e����Lg�3+*=Ic�dq,vZ
�`�?G`��2��3H���3���1eO��s�;��1��`Q��.��?zd/$�85G~'��*��Պ���Ӷ58����M�PÓ8��z��C*�nf��d���ɬB>�1���'�N\5@�����jW�DNJ�Q{�É��%�,� ��]���.#[�w�����7�Ԃ�B@�b#�
~�����<�:�j�rWq.#5�����\��G�h	3��kEl5��pG��I4��b^����($7j`���ź��"�cQb�7�a�Cd���0&s~pS��P(S^��J��&�d�!��r�YxЀϿ�}��C
�y��/4���p<�����zvL�$�?�I��n7�V-�O1��pp7���tu:���q�vn��3��	�d-u��~�(~U�{[O	]8S� >�QL7���!h��*���T����Gڎ�q{_����"c��#����0���v��4 ���o�
a@�.������Fv����.n	yd�������_A�eg�Yn
}݆�uJ_
��\��d4}�_�A��C�Q���ގ���Ԙi
�zSr��^,%��ȟQV�A��y@ o;TKv,������D�*�t<�Լ�ԧZ���v[��9��I}���W�3߿g�EJqV`����w�0ط2����:�T<v����8�q��%�����|�8]�E�1B��n8G��	��1CjT��{_[<n�P��N�r"E��-$.�w T�Yt�#_%u��cc���B ��O����|�X��pHPM�tD4��!�\}����F^�B��
(>c��{��	�����A;8�~����/���	@YH?H��y��5��u��Qn����Y"�Z��y� h'��A6�B��RN�r�jd;_�f�:�,�*����t���| ������4j-mWNb��I���N��Ib�E�Jߞ�Ř��.�AD�i���X2�L��yb�/3�$�t�Y�[�,l�$J+?�vO�̔�i���Kx�:�L�
�Z�;�Z`�j�U��JS�lk4|�;�܄�@I��
f� ւ0�d!]�g���2[�耡l������%���D� :t��W\��4�g�����d̤�c^	L���S�i=�>k`���I��A쪲7��`�sn|9������J�0hS�M�H%�'|m������;o����X���r���
���d��b\W��!6���@&�	a�3��s����@G鵷�0�шH��I�q V��99��Fn��SB���s�S�j�cW�o�>{��7!��PԵ5�I���B!�p�+pױ���[n�ÁE,���$ƷV��^00V����
c�@05�,���|���4�W?�:�	�\v�4f�������A��l�?@6(2 ����א����y�!ɤ�k��q��m���g��u�w��0�B��T�ij�!㨰�5)/��/`�d�2���WSJ�|��xn�\��^�}Ԫu�
���\�^�����N�RDo�X	T��~f:d�+�Q&��'�Vg��y�I���V�C���Dw�(�>���y�)P�f���*��ӑ�yR
�qe�~K�;B�ՐY�[�x�?�TEd���P��S�Y���2��
SU��`h�d�m�B�A{W#�ը�r���y0��4����L*� y��ph(��.�YQ�D�h�G>�bؑ\�4���h��ѿ�	���R
�Hlh
c'��$��
�hMk�'@"�;:8#���y�tlq��3��-_*�u�<��������v�2yp�*�m���q�^�X���PK�26DL4r��(.h����>���R���~Gr��5��]T��@�O�x*��)�e���3_<�o�p��/�����K�/��v�M1��m8W"��(K]$��͗�i��*rj�h/)�Tt�8��>��2��4pL�dcV:�0%#�4�~�������{y8D�������.�?&�S���1F�Ø��Os�]�
����|wG`�E�X�5��#6�[�I"s4aZ�I�����]��=9����m�����p�=�?u�=a\�,>�0E�S�(!V��h5��@��w���NI�2�~���نkH�k{�qj@,B�����El#?,��?� �cG
����_�i8P�$�����ɗW$D�d?}����7Jm�DW� ��E���߫�C�0�W�h!�&��zta�$.�^N��>?qx\#�ts¡G�(�IG�4�B��L�zb�B8��I����u7�l�>S߽H�_�9�5�R�^�����ysx�-��q�B�V%CKA3o��U���U2�JXl8A���Ō��~�-������j��	�n+s5����)p�u���:�|�,U.c���T�Ƥ��k������#�l�J�b��9����tB;�p�Z���ۓ�iJQ�{e	4��5R$ɿ��a�/%��xj�q	���5r�=:�F+?U�:����	A!\I�Z�a7�R�;�ZW?�6�\����:,	:���ŊY��*f$�o{�ob,Ė�LDa�l^|�F�:���odE=awҲ�8�
`�aQ�B��~��V�ׁI�/Cʓ��'���
Y�q�y$�e�Τ��|�2q
��v�g	�喥	>@"��$A��	v�Vs��!���L�����٘�fH
Ht^��uV�����ҘW�Kʮy�b�����&u,&3��Օ�\�
;�F���<��6�䷄X]��f�s����<GeP� ��n�!r���&�����D�lC߶�v8hq��ʌ�*�@_87�Ka5ė��)���m�YH ��~8Ͷ�Ȟ��������f���L9� 9���j�$Qŗ�kTszlO���`$�[_�(�n��{Y.�� [��󊸩�4��bo\|��Z(�cX����]l}���X�t�T	0�?b��Xں`���Cg"���qzn�`|�4`].�5W��UJb���,"��/��$k莦�+�&\ R�|����W{Φ8m ��[�_}�a� ���{�$�<?x�?Vs/#M�	Jn���S�%L�@�Y�>r�&rK,fZ�0(q�.��9$�.�fG�U]~˚e+N��/���À  ��1�'����ϫ�Q;�K"�Z�p�0�2"��O�1�~63H�K�yd���r�w�v6���<?����
���0r2"��4Q,���T`c&GՏdO��ϠMWls.z]vN�v�L+�j�*4�w�ջ�yj�m&�G��,7��z�O��Ty����:���n��}^��X�r�g�_	�1�����E�$$�ꂣ�ZU�{{��$κ���7�6�ޤ<�;��p�ڤ,��%�M�U�s�XP
-'*������o�@G������ :�٭f��~Pٺ���&<�g�r���C[�\�<,#\�^��B��LcZ5��R��À�A���u��A��-:W�<��괠�����5p?��/�F��B����u�i���0̀�z�?N��J $�50,%���{]�vw�5$D��ݹ�Q�8�a(�^�@�"�� �ܢ��
ڄ�=�:1^���0�
��: �'���7욐�N�F ����b�?
��_l��43����Oe���v��L&����_t�S(�P�i�]^_��L2ִ#���to��dd��X�=l��W��ͫ $�¹���9�
ȏM�G�*�s
��SX�d��G�$��Zحë~G��k�9�;�zp�`,Re�I�eni�Ŝ�:0dYEB(*�;h ���h1A��H��֘K+\�a���̅��Q^�� ������ۑ!�/Y+����Q���A������u��14��摦��cĈ
��l�i�]s�د,B�*V���m�k�L�.m�(�:W
�}�$��S�`�ȐR#���߻/LJ�N.�
SŢ�S������N_�(�ihA`x<丬��G��D���ҟ��C�eN�2�(n��A9�9+��c�,K�E�r2�k	�����2�t��a�7� B#U���S�ʗ�	-�}���.`���R?��Ԯ®���d\��
#��~�$^����>�,�73r��yeV#�H�0YE���B3�U$Y�(���IWB�V�u��'湛Y���_}�z�Ǭ=G�|?ỳ0�?fْb	��3.�[R����V��C�P�� Q@@:��k�����r/�`4<�
�cV��]��{�nnR���
DP�89���A!N߹�s��3M��v�Ѿslw���f*�"¢u���Z���VX����-JO��kTk@z�y��-����~�� �
6�"	��Ԧ;]c��0��	Z>bV�Pa�R�a4 ��X���Wb4�a��׽�}D��E�κ���#����t���\��g	E=��r�
��r�e%���/Z��*I��L1��8ZFO}3�����M��[^t���E�f�F��v��S)
'%��
�C�:DB>�@�޼�����A:��Ks&�\>�8��ߢ+@+q4��VL	g���] ��6��='(驵E$�Aϡ����
μ|�_����9ɚ���EdY
�f�HP��<�y`�s������
I�f�8��A�*�2��WO��9�՟䖢&)M�3�E�$aw����g=L/��35!���Bc0�(}H6�ņ�¾��
����sک�����:�>��W�{~zo=��
�,fW�Ȯ�y\$[�h�K5��i���e0�D�T��Y�vh�?p�C}���z��q)�b�J�q3@^��"̬2|�o-U�+T?��Bk4��0=R�gGv�X��& 9�DGWҭ��^
Xȡ+Rtk55gm���e@`��/��S&ɳ�#�jŇ�S����j���Mh��^.ŏ��b\�A�u�k&OA��s4뇰'���s�Z���+<G�ߤo�@9�k���FҚF:�Q��wU��9#�WR�c��}7�Ќ�`S:Mŵt:��))@�v��
�[+�R_�q�Y+T}�A�.?��Ho�!&�EݰV!�83"�rzC���x%�"�uZ��\�0gn6�D� cw;�=�ZY�m���!D����s$~ZU�F�W�z�nW�<�[-!�_�]��iH{�
�;����9N�Lv��}�)�Ők���'�`t��=�����=��f��0�5Zt�nn���T�a4FB��T��zc��X�6�`Jd+[��t���W#��$`��6Dһf
�{�-N5��¶����v�?�V�?P�7��l��J2����ɖ����YnMQZ��Ł��}utƯ���q0�B�/	߮�{���+��rՈ�ҳL���Yܸ�H�ڹ
=݈=�w+��8n�����|�Ġ�P�v[kC;)���O}�|
�h�6��5���L�Ֆ#��h��M%�إ��F�@�kՎI�Q�UG���X���l�x5k%A���AV^\�xk���p��v�~�
�۱�}�5
30�[c?����é�PK��8�m�0���m��ث�4�����[��:#1^w/�������]R3�n��ц+�%�o���u�F�����J��Il_cC���@g\%d��a�.=T��t�%΢�mF�u�ar ��p�-N�N2]��î+Zj��> ����a`��Jo�e 7<bzU܌�OR,,Ws	��|���j鮡�#v3����qJ��v�����w����E�ڬ:Up%p��ŸF��_�X��w x���+Ѣp�ap���Fc'9���wfJ8Kg�$��m�{�I9��p��K� ��/"��.�.ݺ�����6���>��)vY��W�}0:to��n/}�$�K�ĩT[	��2x��V෭���9B�b�w��!b�]5x��9yCڜ�6]����0ɤ`�Wу=��������`��%��HB���s?��JDG ����!�*�B�7_��W�R��%�v��0��I��lMm\ڧC+ہhŠ%�
�����:�P8���@Ĥ�:eb�#���9��<n<0T�r/�\6	R73Y���0���g���<4�`�<�S���	�Q��/̍�D֑")@��]%�0��4�j*5�ˠ��W
C�God�?��9zS����2��XuȻ�H+�+z��+�ݖǅ��;�:�`p1��d����d�]P��Y�O���1Z���]71]�Eh]Ȃ>´g��ߣ�<�=�<��KQ��8�"�e��*���K��j}-m�Մ��>��(�ȌR�i��a���n݂�u��?
{�����=�ʹ���������V9u�[�H�k��az_q���zjb�X�⑺���j�a�Uoc���C�Bx�̨���_�~��Ujs�n��dڹ�� X�A��<����
)\�2Ƒ�P���m��h�X���V�u|��)����V�݌<�H#	C={q�L�q��#:������H��c���u�&�<��$��ل�����DF���%������ߪ^V�o�x	xwR�o"V���*l�=�L<�-�,�e��
��K��w���ޠ��{��CV���'�Y� �;���FC�3/�&�y� �LGCã�!��d��tqc����	3p�y|>�c\UpXn}�N��1ɐx*jV+_���φ:���
��
�2��7}��mϙE�?�B"ܨ��b����8�L�^w�!m��>s�u���I���Z��$��}|�&k��n.�|@�=�f\���oI���E��f�v+Џ�q�`uX $�s*G���}�9���?d�B�Pz?�2F-��j��2qs��S{�G2%�u��؎ oU&��4Q#�zv
�Z�w1��*|&}Hl�"��>L����b!�v�A��VCH��Y7V��?�(��4�*1�w�7�&�4f/����h9�h�<$��+���<z[�%�\���8`f��ֺE��y 04C�6R�������\5�eG�*^�4���C�ƜϤ"� ���[Fɒk�����(�jD�D� *����1���"$�I䯼n	�W������(�ۿ�������]�����y=�J���l��p��n�\�R�b�V@��y^�~�=�m�:�J{��-7zf��<�h� Ί���
��;aO�L���ƽ���)��Y�ෂ���6��,��������񷌍3����L"�kE���Ǹ
�:ak���qNC�"��')q!�No�)�f4�#� ��
���h$ ��Q��x3���̏I ٴToGm��Ŭ�]Da�D��⛘D��*�W[Ipd��'��y��_Shʤ;�x1fX��O.�FQ�wo�p��E7���)}���&�e�Q�C���2�C�-��kE���
_��}�퍌�����P56 ���#�K���X��tB����6��K��Ұ����k���_�K��e�%_�<��Y�;~g����D�3��-���Oi!8P�d�qː@���0�$��r�c�N�>C�(4�|B��!
�������Wc+uӸ��%�;[)w�j[���r�\�L��֤��=���@��l��gt�������.�#���%s��{�e|��:�$�P>R���%�'¿�#�k
�V�$$[�U�_�aN��Eop��^Gĥ�	���{s��l�ը�����W�����M�O�#˲�ɶ(��L�RA�Z�����7���Va�Pޡ����A�ZO�b�~��C�~zȌS���-G�%�Vߪsr��`�+���,����)�� A��,�51 �s^u�_
(�H�>����0c*��_�e�]�h��Yrd$�aȪ�X���'
l>מP�u!8�l�?��m�c���W=���62�ۀ1���_�7��JNǃ�ʻ�57G�����g*��q�U���d�T��[���g���/�q���͖���[�<�zhM�%�X\[�Pb���F�ц c-v���J�s���\�l����]6kI��iH���mEn� ��J(����5ar*�G��
N�*�C�������k?뎇'5�*�%��V����A�|w�>PUc U?NMJ��7k�u)����Z�w�0�s���b"]�o�3�l��6(h|�G����X�q�����/I��ktLa��E��d��۷j��T���>
\Sw�Vr��� ���Wf4�@��l{�x)� fi��|X�� {�| 7�W�#/*Y֬�O�a��!G�X$�U��=��PK���2����͗@�-���*�1�-�n�7
@O�W������u��Y
:�����H��3>Tq����+&�@o�����%����[��DTZ���V��x4��	��n �!	t&L|=;��&`8M�p���j��`D(�G;e&��"�O��+���WQ�;�g����-p��|��'��0^]�:��#CןM�iF/t�j.|�W�l��#6��<�ߠMR�
����1ۜ�\�����#��#=��)5���念m(� u��1��G�BZz����"a��&����ΰ����"�sf4�im�����:�{M�l<3���g�^pIT�6��7GC���6�7+��H�*�Jn~�(���$�0��0�W�>)�r{"�L�<cĜ�[G�Aҁ3߲�y1ݚ�XL.�]�-r3X_5�mrb��Q�%�W8��Ux5jG�ӗ���̐�PY�� �a��
��%����.&��?��n��σVةMrU#���׮�\�k�p�pR�iO�N�\P���,cӬO���6�W3�@���������/x���S�q��&y�و��
09�i<�
jr�z�J�<|%z���{'�b�V_!y� ��I���Q�F��5��gT{9���@�qK�Y>�N�`2�D����Q��@8�����21!Z��Φw��Oy� ��骮lbʌ����!}��MI��"C�|]��O�6^�;���s�:�Nn��1�1&K�R{
+�zF�B%t/'�J�j=rzZ����ߖ4ITc��C*5�`��hb7�����k�@�?�
�����ACfF�ϙ��@�0VDu���l�T��h�#Һ�YJ��)� ����C���y�I�j�5��F�c�ܮt	Q ���p=�*�c2��F'e��q�XϦ2hA�3s/v�RT���y�#�Qi�v?¥P��/Op$�w�{h��6�F
�=��A<��x���'!�c�.����=����G�D-���#Lg�ޔ�k%��őC|��8o������J&�2밄�E�x�z��D��QU�%��X�Nt�^}�-��e�ߛ ϰi���f���P�!_1b��=��  9A�C7�j��F�t!w�>������!*���(F�<��Z���
��%zxw�a<���� V�Ɔ���0�B9`]�*e� Q�4�E����Ƴ�r��d�
��k^8�Aja��KVG��wg/ 9�&^�\y�20��+ݞT4+�G���_I�a�g�nlj�'��_xH0u	�;�?�Bђ���O��������P$�A�=Vk��N�	��B�{�Gϣ�[;�D�I�G��G�1Z��ֺN���.ˢ��
6O4��{� �;��
��Z�7
#X}������%F�#��<��0���Oxh%����I�&EoR��%!��!�^�m�RQ@��3"�K�i����t�(��t`ze�x�X;��  �
����-U���a1�?�	��:�������>k۪�������"������~�6��O�!40��`{��j��
��!�����8S�N9,��\Ǽ�ֳ�Xfd����>�#T���]%��y��N�������PQw��M��ӖХ�W����	 ?����+i	��+�����*���.���{�~�1��)d+~��`�� �w�!��v יp�Ú\�0|�JV�1٧Fu���nU[&��w�	{������0�)d��Ǫ�1].�>���Q�k�4X_��<��z|h5�x�s��Df��\E�͆a�g9��󗨸�CQ��<(� $I�9�v��G�	by��c�ĴN�U����W��DLZ�
H����U��߰m��	�z�Ҷ�[��Ʀ	��nO�zB^çRoh�|LΩ����Ș�jeL}��)ۘ}$hzץ�D�p�- ��~}�=!�t���zݹ���KS���\�����-�37�o�?,�O�Jw��|T����L���m�f��z�rj�a��L���+-?���u��>g����Q<��� �B����Fy��3�[ y۳�u�G"�e0�K�F�i�j��2�I���j(=��ʡ�J�����P[t�
5��͊>}u]pfJ1;+��ٷL���8�N�$I���)g�C��k�߯�)�@r���5
"���N��I�'#���� ������m�b]	ۖ��`�J9ne�D��8�ZCS煍����{��9�Z30��j�y����3��w��%���_�)g�wpM�l
~�^�f�x�7�E(c]1���.VTq��Q;��z��V����"LV�ˈLZ�0���y1��H"(m${��p��xWp�b��1���vP^F �=�ou��-~S�ۤ=�Fٻ���]GK�`d�
���P�c���B�)�;\9\����uS|��)���1pI�^��٣gH�iXm$��ZX�Rt�e�m������A
�KP�F��܊��'�tՆ�����d��Ky��C��r:O-��9ˍ'=�j����
� 3N�Ȇv��R�.f���9�k��ō R�;c�t�+�l�{���H���i�9&��KSE�ʋDȢ>����䩆�l��!��8@���k��&���bt5�Ǽ	����pkV��@��qu�џf�J�y ��N�X��
TI(9�k�W�j-�`WbQ��q*-E����t)�ճg
F;�m"T�z{P��Dq{�K���N��~�_��i��k�:d��~v� A������������A�M:<ӵ�QS�=�#Y�Nl��$���ׄ��� {���@��'\݇_i�G���GܛQG�?D�B�v]�=m�����$�Q�2z������IC�Os�%n�U̥cH���J*�zG���9cMLE�?��� �����M�͝�<�~=`i::�"����V ��ȩYA��|�^S\�s6��4͑�@1�M�������|�`�t῅��?Q����2'��%���T��*o�J 
Ǆ�}��M�D��a����;[�Q���F���a}H�$���q��\�R���]��H�iJD��G+(�H1`����n�y�NZo���e��7Xuս�����=?��N�j �
u�I
����w���ro�z�:^2X�F�GH�n-G�yn��" �j���"����g�7� ¾p�!���Փ?nK��O�5�r:����'���#,�0�?f]�	�'�n���rI9��2U  ��R��E�|/S䮸R^�a�j
��Փ�I���\����2�m�P��f���XoI�Ѓ�?���/�)O��Q��"��W8��L}%2 |�� �"����Ev�%K�
���RE�i�G�����cĠ�'\+����N�|��/ݱ�'Tɮg,"�2��c�Y7��E�2t�~����_��W��ʹ����14�Y�%�P@H�T1��-o�Z�w2+LWoQ�]��<�&	۟�r�J���X�ƿ��8D���M
�P�X<
�[�r,��Mm78����rI3��a�y�q+Fj�������yY6�3�.�췾�~8g���
����q+ge�08!�JV-�2��
���1u�y�X�o�,�
ͰN�-�H��CN߷����ʨ�菑��F��v}\p��B�}��ŤU�q�}٦�@�^mB�twX2��Ô^�m	�c�~�y-����	�3y3Jх-j�|c
��L�����"�x�̶4p�	��̗yX�t��q�'�1`�bjh��-DT�f'�b:VӁny��3Ɉ:K�)�P���#�\�;I�v(��C{BKO(�<�����,�����iv�ze���B�K����pU�:�%֝��S���Ǧ
J+/9<ՠŐ.Y��{�(��ua���L�gʕ����"ֈj`���m}B�1��EY�k�֊�T���0���u�V�������g#��a�a�m?Cߖ����.=��Ua�S�E �N�i��~UF�Y��*n�)������������ߋ��X����1S
��zX�,�CX��j%?zu�mEt�����U�43��|�m\6!:[�7.�_n��\�m˱�,a��E��f���/�[Cf�ᦂ\
'� �O�n�-<f�.Z�[���t��G�*ג��e�Y�U���h~
�I�����;���0S�"y�0R�J�B'����`��2Mtx	��j��NO>qmD�V���f�Q�
cՊѦq2��IS���cg
�N(w&�y�H��T�r��v��*����]� !�1�H VwGM�z�	\�P�d:�&�S�͛��՞�k��:{i5YUK��#7W�?�1�����G*�0�H��g����?��|�K���l*� ^���63����LU��pbm��]߫:pfF�P/ɥ�<C.d_�*~���3�	����vԶH�=�a�~�I}�.ڡ ,,�iE�x�Za4�_�/Vi�[!����M�YP1��N�X�@	}��lT#v{�W@4	�~�ê�z:׸���˺Fҥ%)����(Y������k���WS]�,%�t����>*
f�(	'���{0-��EyI�b��&6�+i�/I��~�?+iQ�<=�_f_��)C�����/c���ӛ<��E�V"eO|R��5~����=Aˡ�oE�-=j ���IP$��AX���y3��)�4qkZ�-�5.���w�+�g:=bߌ��p�'H,q� ~���/�;���ƜC��J"o�s�
q},�)�0�8���H#�������?\���җ�jm�"�K��a䋙Y`d��h�ݿ�b�U���ʪ�OҒ�3��&�:��HM��e�A�I�T�IY4��?T`��Ie�t��I�P���&IƎ�e��z����|c�_i��gkyg�'�90��A4��A!�O�X/Q�#jaH8�w����!r;-��R�<�L����m����oB� D��HK���@�c�-(��É�ͳ�4�q�+�M%�;�<�E�v
�֧��`�����E�����h��5��
`���1=L�|Â�-�uNʨ`��apay#7	o��|#z�A|"�H(���ՆջW!B�Ԛ��TA0�ΙQr�(��A�#F���ṅtdK�M��Qӊ1oR	.ؔ�yrNjc�{�2�����?�?\B����i��n��0gJ�\�����Ꮢ�}9���Y�&�C}��"���K8.��zl@Qo6���K����d�����V�
�.���U��J����R�K?n?�U�j�6�u�p��4	c��(\V����\�U�@�Dsjf�G{JFv��ݪL3�m�j0%+W����ʶr� �~�f�����!!����-��)4�\>�uX(5�U����}���Ԙ�ur�.���pK���� �'����?�O��s�fٳ�m���*=�Z��$��Vu5E��77X��]~|��?m0�������μ��OD�z�(�<�/��1�rrR��K^J�S�7/�43` �F���i�kv� v���s4��:�#�0#��,!�����<�E��[t�9�3W�Np���B&"ի��wҤ����Ձ����Ҍ���	��k¢w�]�s�ʙ4��g�PXo�@�GO@ X����n*I�=wj����Z?�(�g���������K��~��Yk��V{:@�¾�2�^l
�c�ԛ��z��l�\�L��@��%��'R܏KZƕo:!e圕������7=���p4*��������`W�-
���(�	���N(@�9㵄�J�.7+�Ѩ�x@�o�mR�퇬���3L�����!u��[y��ES%����i<M�U1�����#����`  "�A�U��-�)��O����Z���}���U :�ý��4Ɍ�T�g�;I/a����-د+�$?�/����lW�a�`%�zے6
!����;>]i�M��0��&�����e�����
o��K�^}��
Ϡ����C�E�,(�(�BH� ���K��Q� t�B4j\G�C
Z�`�8�ٜ��T1�h�qN6
h�If�2�k'g�R'j�x#�jD����ۍ�P�
d���JlB�n��e�/B8ka���R'��.��"�3��6���r?�C���w�hɨYO>�*�N�M��<��f^���%�C;��`�4��=~�F�m%ⱏ�(���Y�V{�~>�ɀ�LĂ�]�e��$�<�l�շ�5�"Z�l_ٺ���Kˣ�!:/�����K��5m��_��:WFڱ��ʸv���i[ף�5�H/ċ$������0B�(7.���Ӡ�E�s�s�!Tl��;����H�s�Ug�a�����e�{��z�G6���z_� d�2�
}�	)����J�{q�������(Eo�d�H���,Q�\|b�%���g�䏖�����.��e
<fˑV3���C��A�Op��RQȘ������Os���q�$i�2w	�+�#���z��n:����^V�O^dJP�z�?���t)ە���ZD㤡�{ހ���Mt\⠂6���iֿ�\�ŝ�)���?�JKtY�M�z��y-��W�iY��� ��O�:}RMξ��7Ŭ�ڄ�e�Ŵ��\H�hO��3��o����昼cY� �˨-خz��0u���8�V�P�$��:�	m�Kdļ?��;��Ȏ�;7�Mw$"��3tP�8Io'i����@�?�E0U�n4��W�!� �I?.��)i��K��Ww<C|��x��QY�&e>�W�4�����L+��\,
��([��0P3,�����.�:-�ܖٯ���^Q����9cQ
+c�i&ొ2�B�j��ڭ[{���-?ad�C�k�F��;��|���]�I"��U������.����������B2�y9��;�롅H�q��E���+Y�\�̕�T���牡��D��0����H��SjKm����_��j��%B�����E�i�O�J�<+j�Y����鬼�����u�{ع�K�{A�Щ����g��ϴ�/Sk*#*�	p�~��`3���O/�מ��)��3;��د|fꌗyT_$ �+J�g��p!<Z� |����}���I�����8~VFE!� g��o��L�~�y~/\Cq����U����޲�\!�J+(&C{��h|��R��-�4w�@����J}�-?	�T?eq#�T��T,�^�,�����5$:{7�T�ݝw]q@:�>����e4���4AL������Ȝ,keLճ�f_�£;n�@+%�K��0�7rF?Qֺ˃��mOg�T��5�=�϶hHh��6���<�O�>]��ۮ[2
/Z"�_IήN(mv��w� <�֏��G�~y�}�󤦅7��̓5��)C2��)�4/�̬��M��'�>�f�g�i��⒤Ƀ}��3�ɗ�	>�?MfQ']���EԷ���M�R���p�@
W`��7��gI|,?���jPV��<#����{��<b�W9�+/7�NSU�D]�
:Z��π��'�b���0zWI[�0��܃���4`hm�څF�cw�kd�:3l���x����#��$�ʠ���z�����;@�5���� R"�����g�25�4��o88x�-�T��R�[Dh��a�l���"k����+����O/YN�
��R4޵�a�Q{�V,<��	w��D�4����?�ܐ�l�ߝ�B��M{�s|�h�%^om�(�����M�[QQ�aI��B�Ĳ!]��u�2h��֚3-��
�-�Pũ��m���5��`���N���Mk+WǴu��1�!��S4h� �6��"�O����]�Aj� uҐ4�K9TtH��1�v����&'��R<�ə�u�����+�1H�Ĵ�>r��sY�o5��e�p
���ԣ/�f\��B�|>Q�:��o�:��Y\�5<�wr�� �)��|��'Y��VߐvO.�M`a����3�E��,�ݵ��j�'>ۡ߶�\�aV�5;����G��|w����� ���5���[u�O.fx��#4s㦄�r��E����	��Р<}p?�	Z]�'��C�f��\ZԴD,O:t�r�jT��@��1���eJ��o�i�cう��~)?�� V�+R1�W��E�����rT�k�uKx���=�z���f��,�N��\ݗ���!���x���<7:qjQ̙{�o1IiM������x���,h$p�\!����hvEğ �<<&�������~����OitL�����Q8��#inh{��N��%��m��W31>_P��T%X	�W��d��q��$��
�� ��		��z����$�y ˸�F�%,�Q�U�]�KX��9�5�&���<�� |�}�&-�H8<]q�ݢdVʻF���;vJM��5�I4`V����)�Dz��UpP�����}���t���XWZ�"7�̏6h��h#.����1�
=��E�H�-���Q!̳aG|e9��2%g'��:���}�2�{C�-Rv�[��
z�J�:��k��Bċa�8��
��K���w�,��[/��c�:����!��A��Y�I<X������7��⻜%\�~~�^<25(�q�dM�����zU�H3*?�h`�Ɉ����s�CS'��f�
t�wU��
��4}ư�Τ��]�qX
�!M���S����,X隍��7I@��ݣ�p�g��ŧ�����Cf�Ing�K*�'wn
�>%���CPV�� ����SHi���Sx��|(F�I/���Lb�w+�K>:�HP�R���FKO�eX��wj<�'v�,%�YV@I��$���~]a�����D�{t��+C�;W̌=���
�� Hn����ю��p�]��D$~x�қa�}R��0��`o�ʼ:��6�CL�qe���6�Z�����fD}կ�EE����!ʿ�Kh]�����4I�[
[�<����z�>�ށ.��_U�b��ـf��p�^>�$Bo�W�k�+n���ы��[�i�Y4e"��-��L ���Q�d�S�xB�|��9�B�u����llOҤ�FWB�G)^��bm�����t�N��V{��A>��$������ h�!ٸ� �s��N
�g�/�=�#�ga�>կ�Թ�c�_2x�j��Ǡ��7���>n��YTྔˆ�c�3���*��̼<��N�n�/�H��{���Ql{E~���I"��7��YT4ݱg��F��Di�-Ĺgp�4j7p�p�d���k����Yszss}���A���*��a�K��x�;|�4�
"s��JA�2�O��(�%�'��p�X�8�
$���cݹ}�P�Q��d	�F_���� �2|g��Vm��,Z��\�:�Rfy�ְ
 �P�e����}���w+I�^ �~��e��c���*�^��/�S�#�l�O*�S��dd�� ��BL�h�;�xX���fU�0J�;�+,9�;n��*� �,:��\C#��L�v���M}ѧ�9@�)3�G������ZN}0���;�3U��=����h�!��ǻ�c.0|�0�T�_��\�1ii(������Dr��n�2K�e�պ<����
�A��T��֭����Ny�qo�tWܲ�Բ]�Ҫ�<M'
���1~{�Dw+�#��%�T\`��T���P�6�]-��D2�����}�-�7��դ
R�gBş��j:R�
�},�F<!3g�m1��:��pi���SE{6P5tJv����3�3���������n>w/�ý�cA#�i;m� �gJ	툲O��V�T��9�9�ƱA��~��&�A���
}s�/���/NY�?Jj�2{�P�����t�l5^
.�@$`�%�(}WA��nA�f��y��+��
 ���U���lb�9	3�>��օާ-���Lj�ʀ'�6���fEAu��X�%�t� f��f5Z�>
�]�D	t�Cq���
P�C��F�1���X;w���̩B�������s^�N��.�Zk[
�\��lN]kg���� �,��Џ����z�������fk�1p�:��⶷��|�4��QH��0��7��%_�l"��}�Ш�ʲv|SIm����f�^�ςM�ƻv8wG[�������wUÍd�����*?os�m?9�P1�IG��^������䡋�(���*D��>�n+�H�X��;�^=@֩/�MI�ƍ�+�d�*l8�e�S��]��'�/��g��>)��~_A�L@}���/{�X!a�!�0h ���F� ZI)�5�s3$E$V�͹0�Wu���$}}�Q�X�r���r���l@�c�mM����D��7�Դ�B2�
Ih���p�Ķ�4ҪH���>W$JbLN10|�vU&]�<��rJ��K�����i�]:�i�W9	eo��Fv9���)���wX'	�nx��%M�>�
�_s�}��i�(�T�qjp�D������m��r�	n  ׅ��{ɠQ!�����R��(H�׽���ǲҘ{�����^��2^�\�?��M�_�p*�HK�ۤX�g�`9���gV�0��)8���f�Av�{�����:[����8�\�D���$��e�k�Y��Rm1h]y���0%'46S����+^��F�s�ؽ/��!�_,*[�⡹�!�b@�Qذ*�M$3ڋ��)�h��ja��M޳��
�e 6�/W���`,ћ�=E��I��\��
NV����o'@s�"�7����U�t{΃�p�*;��ﯤ�g���VN�<����xH�eRH!)�Bř���4B^�����[�x���o;������ނJ���.��:�P���8q<E�!�]\a*�ֽR+����6'r�v~���� �f{�;6G�W�VNL�e�K�]7��fV��%1c�3Pb$B!ޥg^��UT�z��B>�o�F@� q[˵˅T���Xߴ�;�2��r*EX:���Ukʛ��d�M�
����&!�0�{�����K>1���*i�G�g�ƶ|��ϧطH�2+N���R����6t�K};��O��"Vd�/�Ǖq��;��tΜ!�  �l$"�Rsy�Oy
�$�%^tO�!�T �SYdAX��4��gJ��L�������y9�����,{�1��wcῷY�E���I����@"F#~�h��[m�Rn�~����9���\�]}�����t�KtY�c[т�ɟJ1J��"�����v�<y};��	&���竕��r�f$�w�K��)&����OXk��-� kŶ
�C�� 0Z0lk6�����<e?�$����������P&?���˹�)]L���>��xjr,�D��K^5]��8[vg���z��Eq
Nw]�B��"]�Z�) ��"^�b!�1 
@�OB��6�Z�<6{e
;�R-��S��5�62����\o8�wE�#�U�ZZ8!�  Ț��P��P�H��i��5ua��FEB��0��X�LFm�{�mb�f��aU尲�t���lsm>w�>>#��l8�ߎ�Pn�RF����˲�p�����s�n�����>¶�}�]`$�n�z�a7':0Յvxl=��ٓ%��Σ���<�『�|�D�7Z�%+����"D�*B ��"�I$Q
-A�M�r��!���@ĹA�X�S�V�y +����HHbꉳ�U޽ʱ]O�dB�g |�;A;r@�GC2�xF�DnfN"�l�{�R��?��݈>�y�0��udt�=2�WAZ�]��Y��1bh����]N$RdXhQ���_����U��@�v�J����|��!��­�����I"�
b�u���o�8��QrC� F��ER�G�H�{n��DI��G~r$(��������.P�$�Jb2L�TxM��쫷)�<�H����%����gܥ�6���ᬋ7�͛����;�{s^�1L���aW �k�*r�@�P'x��l��2�%�Y��b�sHd�eo_Fv������q�p��ņ�a�i<�df+�2�n ��Y�
�%���;Ŕ�@�:���m�I<��XOt��*_Q/~��K�Ʒ�z���CC�'
�n_
x:!��rdh	�K���
G����L4�֦��:
���C�=^����ת,�n�f�dz����*���ӄ��S�ic�tD`��4}k9��,����/���D��WѸx������׮!��� ���R��8i ��Ϊe]W+t����.P��)>:_
Jn�@H�IW�qg�,�v��P�ֲ��C��u�,{L$�=�Wn;;�;�����p!��� ࢳ� �*L)�ԕnI�Te_w|ނ�l�>_�18��qm��s��@���C5�<\)^�;`x^YHp�*x��@�,�I=DE ��.g�)��3`9���1�`�	��L�}:��E>��-�>c��%"�ߎ���߽R�:��p�r��3�<�RZ�+�1iP�Z�q_��vzL�~�0��5\�*n]p�� %*���h06���w��nd�Y�
-���U�v�<�}����/����<�Q�-P�,�]��(�p\�� � �GH
���E�o��f.���Y�ֹ����[ܯYs�JJp�w/���+�v�T�<�4�ߛ}A<��
c���F3��t�[��j���;��V ��|��;���M�g������`Q��k_�{"�'���?ɵc��b��~���lN=9yЄ�ekS��۫p��6X��\�[����[��p���0(���IYZ.�m(��1�f���t�E"���seQqIW�f��[�h&SUf�$�<G�@n��'�Q��n�)_F�FE[/km�O*�]�}�r�"��!����5�تq��C>j�w`��w�u���0+�y'�p�t��d*;�b�MZWw���M��͢S!�p������aSH:��pU�ްS���l�Z�^E���,�ҕ(R�ρ�a��6U��&ֿ��*�����K�u�vR���+�kJ�I��\f����2'����\�z�� �IW��~*��l<e���UF:.��!B��H낔��ih5�)�I8͇�IoqMXz�vO3���	b������#�	C��Y��I8�*��x 
� ����(�����gD `|���1$�j��N��䇌�u`�~��p�L�p\x@,)5,��ũ~��*Dez��*9�ƾ��5�:!Z:ݰZ��#HE+s�7��P��*��csI�=��;A	�fB��&��B��V*�����+�@�tf!������Q`�6�B յߕn����©���\Rǀ�]�R�S��	���;�B�gW��Ţ���c�bjZ�(���1	 2 �ho\R6�I�Y{կ?rOsN�8��t3:˗P���>��Ο^�s�c����ɘ�w�Zk��nW!�Vұ�@}@;�z_
B���1�R��� E�i�r;ln�J!�\O������l4x-� ����Ce�[�U��N@�l,i�>M�/��x��a[R�ەVT��|Y_�x�0��>�_[zT@��|vnY� 1
�C�<�ج
�&C�\ ĥU��ZD�i"\"VA�M��2J�% 0�zcȗ^�ʙ����w-���q������T��C#qM�ASe4�%�t�G8y��ꄲL� j�(��ϵ�V+��{��,�\%\�5�Q�ݯ��G��/�@��_Q������W 3Gk�! ($�@l���\�	UpQ�(�j�r��7�ʊ�[ƹ�hu,o�:o���5�*j���0������2�*�a�Ix+��g&�s:�M��d�����p  �A�d��O�I1�o	[��j���\�3�J��3�-"g|�֤� U����c\p_�Z��B�J�]�*����1O��a-�Imk�ƨz)�q�Z�K�d�}p�t�QwY33E���$A��D�	B0^�����x�x1��{rw�����A�}{C���S����3�]Y�˒�� ��'h��T�
�eiH�%��p��H��d��[]�L�RH��U+�ȡ���$�[xB��Nv�����4���lu�rк���k����[�������d�K%��1͵�T<�R	9>|0
ҟ+pH7D�����lQӔ���DL}��g�QWª쬘����Ɖ��������K<R�Wa���\����ζS:
�! �p���հ����Īɉ���*c:��8��� mf[���a�iڈ�=�.:Ĩ){����s0�r[�a����[�q�|ee�����"��s}H����s��H��
˼�o��Gs r���h;�@��� cHe�7��R� �5�dHuZ�h�1&��[h��PϢQ��M�m��@F@�����3���ư�/��;J������"���U�5lѭ�¸[�q�2t�"�Q��I� 
<��͢>{�Y��'��Z��罳0����Rm�
&:�M�F��]�1�K�]�׽$�-�_�k��F �D�ъ����
r�]�\g�%X&7�f�c��:�#���){��a��5�Daf���kKԤ��m����y��$�ڒx�Y  ��u3I��)�4v)%�Λ�Wކ�繁<�?�nM���L2{�9oA�F'8
�V��kW!����x�6������S��C������e��CZ�6�y��� �n�����L��
U��W�
�W�sm�>5i<���Ww��l��=Ob�"�I�f����3��Ds��9T}W�@;��a�~��D���S��N^,L��)e�_yJ��C�)_V�7�v�糣�b���%�5�;	��-h)~�] ���:��醀~��F$U�^hۈ6@pq_^6 .��6�
���R�W�/%���Y1�:���s��Z�w�I\�8 ��Y��gl�؄��X�u�x�=d�)3���۔O�G�b�E`]�ܿ��nk4�
䶨?Z ��
�J"�a&�� Rm����d�#����n~�FV�f��aAha!�� ��d�epP�?���t偤��%����ߛ����9q�i��;d��z��C3 �3�/ ��sC0�8��峛+
7އ��'��q�S��l�Ǡ�;  �h2��s����`A��@��b��iFOm�v�9����Nt��-�W����t�^
�_\��W����~7ƙt~
�m��8����Z��ם��T& 6 Z4Tq�`�fQ���ZA��o>�yB����PMa������P��g���2����l�mG՛g��iR��%gÙ$�(w�bISR�v�UuR 
���:��A�3Cv��'3��c.o� ����ΘO�xE���bϹ��N��A4�MĬ>M5q��GΣy6�EKj�I�8�;h2hfK1U�Ʃ%�8v4cm�V�W������ E/�T�;�<��xk����dVH�'�����(Sl��;B�͂Y�C,�O �����D�Wa���.K>c��,Dw��N~H�3��ð�k�\T��A4"ۘ��w��*W��u5��#����!�C������0y�H�} ��k{���V;�����ٍR|g\DF�����u�I�TUD%k�c��r�)��*"y+)�J��aob�$,2�8%*���ҟ���6O�txW��3tHn����.J^��T�Ds�/2�2����d�n�3���9�p����YtLG���@h������qO.ԠX����6\�H�^7Q�J��Oiڙ^Bu�yWٓ<���|�1��W'W�/#��PG�K�d�|=�d�1<Բbb��8ײ��!�J"#J�K��n�|��G��r�8J��o���gmq|��"�fƷ/�
0��E�˵��p(�S��aQ��M��::�V)�k	��M�^eKᦑ���>�rv��[�����zu�䅏!�\K'$|7�;�vw_W������Uj^�F�el i�3�65=�-S�j��:[C�}.�P�Gv\����y��8������C��9�P�����&b�٢<�E�g6�1\�40���l52�.��e�gB�����4e�_����r�3_Z�R�s��٦�|��^n���ũ�C '��>��qy�qi����u��������c������mR�FB&�>�]�T�u,d�~͢�:����Y�����
>T���J���Vq;��yz�aqJbZ�P`�(�)h������U�l=��;��1����
w��	mD���X���� ��K��mi�e�2I�����T�8��҇�y�E�̫�����*������h�B�vFTC��s��6~�閭��d������L���ɚ�Ҧ	�
jQ��89����yKde~���f���%S���P�tF��j�J�f�h�M�!��f��L�����kG��*US�qy.؅�>�М"q���5��6��08��k�!�e����Xz�YkDq�w�$�7܃�r�^-!�}�����TJ��G�>fSɬ�x�� ,���[0$}ǫ�?1��?I�[(�A�KN�q�9���</4GT�������+I�ʩ�m
8O�M	��C�H�ӛ>�:z�)v�(Ru�M��(�d�F�y!a+��I$K�~�����P�l�>3���ʝϢ+��g���W�	̓��i|[�����VM���o"b�%R�eDPP*�CWK(Wn���f�R�
����k(LM��
ƀ	_T��Ә:�d���Os91�}�M��� �ˎr����`\d��<��ɨp�b�{m�/Ǘ`�F�%�bUo=U��d�d&�M��8ܧ'��l��&J=����?�m ���Ȝ�ՕO�h���i�8g7������cV�9x�z�u�} 2�K��z�S'R�4Nw��m�t^5��č�O����e]�~A���h@8���0f��p��a��7�2w`��%�]�3�xSo��˒��8��c��^z����8�#i����<8!�ۇ�S.�v^��/�]��D�GC��tL��C;��磘krL���¯9:�C��B�V��*cnE�����Z$q)�ko��g���]�-�ۼy̋ޮ�wN��w������q�?�� ���"�ݘ�H��m�tB���P7�
�q��	��
I�`s4V�9�u%�Ҥ6�a����
�>����X�n���C1$��ǚ!wԭN�]����
<ϹTj��_�#{
UIZ��3���f{ �_e�V��m�
-8J�Q��~�X��#H:�[�+� T�
8Ї"���"?�2����H,V�-���˰C!����E'+��|�t�
*F�mH\�(�'y��l)>>��a�)�	;~.�T�g�ʧ4e�>�Kt&p�|x'����9B���R�*]4�m���u����^Z�F�Zt^ܫ�7u1C��[Z����w�`qa�F�L�b��X��p�c
\��r�戢r�l�'�räq)_�$U��D�[*�6O�\�G״ sw	�eX.��f
��.9c�vYj�M�?�(*�o��n(�᠃��F�<@
���/�x��ud4⊍� ����)sM�c�%uc��#�<���e��
�t&�|"�`Ձw*/�7(;��� �B	V��@!Ƈ����52Q@�퉻!Y=	���uΨm���7(Axg���.v��/Τ�׶�9)�����e�C�P�;�PPkh������Rl�t7�=��K��u�i�x��=��Vӆ���Q��:H��/E�����W~�'cХ����̧`�4M��`QkD��c������φ�8�a�1)�t��e�����שw���
ѧg):l�%�sm�!�qL�;�#dI[^���{����t3��C�tI�u�L����R�Xc$8�+�ģi��g⒬ ���/��u��\^6�z�2VT>}��jm�����6H�2�K�^�_�!D�0A���öAah�#��|���#枔���z��<���p#�:�&��n�t����O�*������V�6	vJ#G�>Vf(6�fl^eH���ֹK���>�㺻����@�6"\Y:�YM�ݨ�������u[��;c�p���3�عJf����d��ki������ }�e���~�F�ݏ�z�c�Ӽ���Π<�!<+RB�so��NG�C�I�JBi�$�q۝VN
�>�V
Ww�#�D�ụ��!HZ�T�[E
�>=�`��׼���$�?l琦�ώm�)-ͦL�[(���}h��
��߳����~�K�Y�E�'�͟�y�J��yV�
_�W�Bo5�?�����X��G��2��E��.�~υ�ǅp�?nn8��7-�Bbo]� l[�Hȿ���"��7��h4Ό�L~:,&_��`KI�C���9L��y�M,��n��n�$���D��%��a���4���  
mQp%�;�K���UJ�[��O��4�~�������۴����o��/^� �������JݭҮ9�]�$P��THɾL%��o��΀�Ǿ`��]�N�z
�焗�Es�rg+�2�(W1�~g�՗-��m}+/��Kd�,JPL�e�"P6��z�8Y�
C����H�u��5���gZ�H+�#b:��'r5��o '���2
a��� ����jn�|�4#D�4b�1B��lI+._�f^mF���ˤ�5�E �#�W���%D�D;� ���'���/
 #�� �T�O���9
�NV*�ͭ747�GЁT�Ds}_�$0����ݖ�^�A�ܻ"��l�S1G�J�d��yؼ[x3PR"���c�!�=���X������M�
��>�ue(QlZ�۹#˶��_=���Վi��K�w߿}r�O$�T�v��%��<
�i)KT5τ�e���ż�(AT�#�e�*��ϯK羮�W��/%�4%�^j��9w���ȱ�s��&�_�*�L
��
��0^s�a��ā�,��_��){���9���
�����i��/6i��Q0�����/�
�c�W�+(/�"շ�}h%���[w�8���#�$��{ ���h�`��פP��Ҷ�����x��bU��V&��T1NB`NN�Zr�����>2�ӌy{D#��K�����Ek�9B1��9�H\G+a�b�����L3n��z�;�L��V��������0����Ò��x|�Ʊ_�j����%�%�y���-�x�������	r [/:�*a���A_~��NJ����u��]��xE6:���� ,W�wR7��'�\�1��- n������9�X��VW��Q�����r�c#���-�F�����z�*���514��qf:�#����eO8C��h��Ӝ��9p�n��Л;��V1o��R�S�Ux�+Q�����ɴ�`u�PT���Y,Y\.����w��
����=`��aR+��)z��O���:�0Ġ{��Q߈c
1�J|k���Xkނ*(J�z��N� zU��8*}����.f�G���J�^x�*�8R��>�(�#ד�H8s0�|����HA��7"8�K�L����Y22�t��vy��HF��O=m�$u�
8��`�2R }�3����Sj{�����c>���A�顖�jMp�t��^�un��*~��Vtq�!/�=	7PFZ�c�k�k�e��(��U���?!:����?��?gnZ�͜������ ��V�4Hay�N�2��'_��D}����d)�����i�3��p^yv0��T\��ɂ�l�_�v��6�Ƴ�O�8�5� ��J�(�Ċ9��3���ٸ���s�s��٘2�%��ϕ��a�s����g��?�Rl��.\.��˕n}���P�\����akz��`��?�Xm
e}b3@},z��j'���qH���<���-����
*�Yŧ�f�t��S�� RG�1��t���d����(�/�� /;���P��a�$	M;F� z¬����XQ��L=L;lC�Fq�OI
��}T^��wa���Ҵ����]���]da���
�Mꯁ}�D�e��z#�3sv]}�gp㦥��;a��A�v�"ͧå�4v�<��V�ǌ 2������!���J{��}���[���I����)�G�b�V�.�����D�Ժ
����r(ST;�lE@!��/wDo�QM? ����wTO5�2�G�IA���U2d�����Ar)����L�OA��e�E��%�;�s������7�^�3[?�����[	�|^���!��s�n�RAK~r�~`�^z�ZHI�����d�v%�uU�]����'�eΗgo|�v�f+�<�:�lШ5B7���Y�d��X�_�M�u�4Y��8�M5+\�j2��n�I�gT����������WG*_�����]p�*����A�4~�ߐ�[ǺH�c`V�����A3R�O�1@���+�ݪ�Y�-𛀳�����&���skO0T&R�.��ົ9�`������ڊ����D��C5���v4�
�
���wڇ�	��k؏J->6���
�Ux�B�Sx|��ȫb'v��>���{K�DP%��N�Ny�G֗[��6F���~��$�b����:�+Y��ODJ���ڢYz�ſ"�5�[�L\�I��|�{ҋ��:�Ib�����ړ�Ϫ���
��2��_m�M-;��#{�AW*6z�٘����LǮ����-��(�
V!4��oƧ`å�i���C�a����.aª��x�']�$�e� |(�Gja��p�v������z��@��\��g�FFph�%l�1����>L���c�1�gh��	�H)��l��q�?EԒ�8yvr�Z�ݮ�]58��r����*�G$EiNٰi/畺_�Ɓ���F�?�zȭk�\b��O�A�j��\�3��(�f(�2����������*����)x�wvo�/'����<����A�C�t��W���7~�E��0؂
g�t�d��R�|�R$��� �vmqӧ�� W��%�U�an��`f �+&W��F�܈&���5��v{�?A���?��
���]>ꙭJ����$�P<��5@�����mw��YU)�!��/q��w��HA��P�>{7�*�$sq�:���*���<sʧzf�S�b u�E��<f5x
��A��2�����W�ɆZ����x3��	�8�" ���b*
�-���N���8�kyn���+�����P��E
`/-��,\J�f�������_�-(C	ў\��C���\X�{i�/k�#�4�=�Ɇ��p4ƖV�Ȳbr ߝڸ0�LF	�l5�J�!��׍z�9�`m,�)�)y�M^�C}U(�t�C��dNU��X;���b���	�Ѯ��yg�Wg������E{}E���P��)p�NW��}.W5�ڔ9?��^&����#q`���.H
�D���n�Q^2�..9-V�v��b%��ܗ�szӹ��α�HYx�Y$i ���,ih��9$�k>(L�QP�Ž�<WϹA  $�A�������e0 "v/�%?z�wI�T�e]Q�GtI���ME�j5�QO��	���� E:���f���Y0#��-�q@DY��ݨ2��?1C�L�AM�$!MɵG�ؿF;�No%
�䎚	���1 $[����?���+8*ne�ǁEY �$r�c{7k�w�t0 ;�H�C����ٌx��kB�.k���:f�0~��a�	������\"x�
h�0!�ئ��$�<0�|��1����%qpYŎ1u����u�^A')ހ�Yz�l������G��ե噠�������F���We~L�%��b�s{��׶a��H+��Ǜ�����C�ܜ���^�'�=e@�OD"H94��|	�Y6nkK�?���ޔ���g�X2�%v�H/�0�r*Ix�e�i�S?'��գِA�7�3��hKa�JM�bz���8/"���2M�B&ڸc��(	 ȭwr[[�~��yf F�:0��n�x+���īվ�6fё����ٳ^o����&Q�59-��t��������U�J
��N_G�>���b���'�Xϱ-���.�V�j@4�T����� ��[��g>��#�_�2����jXPM�)}�Ȇ���>�g=�`=��H�
O��f󖦶b�x26e:q:<�-��Ӄ
S~
HD���8���\���Ĵ�l��b������B�l�gb�+���0�ش��+�ҿ���s�-�f�2v�uc�ƍ�[/��A���\����̲��_�z��Z��ɖ�U
�ѳ��+7�'=��Z�'x���\݃f��6�.��	��K���?UN_Ҩ�N)����ߓ*�8�b�uN�iY�P���Ӕ�@�?.��+�EJ���0R6�o�l�x7Щ�Jfw��,8.���:j���q����x��,/��5�c�|Q��/yh6����57S����|��z�#����F������\��8�-]�<^p�g
@6��sAvY�<=���z�L+��$m��r�����v�:�;���\b�${��E����	��-�,��3��T���[&ʌU�z�){Z��
W3h��`=�B�s��`@U@ �`����P�8D�������FWb�,G$��z�)��F���������zqt`m4?�v.)7獸8F���}�Nէ�@�Ã�&~��Fz,x��ܠ3��m�9DD��1lQ��#𴸪y9�l�!�Q�V�&|�O�38}[�X'�Vn�������䧰���9k0y겁��3�ҖR��{kH�b�*E�2�Ʉ��5�&i�c��9V�hW2�vuÚd� ;hkJM�4}��@��)�M��(���,�d����hY���P˻K�j膑�$��9|��Io�7z
yQ;��d=�m���n=O,GV�U���I� ���p�t���9�pr�Ħ]UP���[�=�|O���*8��5�L����ZC��Z�uqn�;�>���QI9���,�RϾ��;ܩ-�$|�덐I��3$�ϖo�����̲t@��[�
���5`�;�F�A *I%])v��~�#i�������>�̍�l�@g=^@�>����p����8����{�+2!�۲UY������� ���l\�1E�Ö��?v��%7f�,+���-��y1�L�W�߮�ʼ�F���Ӭ��{Ɋ�Y�w�{c^�Wa�t�[���>x͈A�8h�B���N4�>uӜ
��|���Kϓ&1۴!畴�,t��G�W���Ѿ?
�,�m�mv'�����.��[�-�?����݈�����vA+�?��R�1��/����Bo+
.BIJb�Ʌ��D��
#W@h}Q]��@�~�h:���h���Tݤƈ�V&t��{���%o����Y�y�cY����
�Z��R�n�����\$���r�!�"�5��GV��F�i�\;��r�x�xV��,�*��Lea����κ5�/�%ђ�8���ʊM�/lNت��}k��,蔔O7XH�r�&15J��o������2�|��$1��1�q{�ɕ`���q��F���_�w{�j	!����"�����d�2I�c���~q�\� ���w`�	P�E���g��U5������-���lrQ�%����'ʲ�`"�M1�E�غ�\�J�S�
r�Õ6Mct)W��;�9�`�J�43���\�a�l�_��M9)%���dh�2C�-��ײ&҇���|���E���
�ۍY�u�HA�[�bwc����si�5���n�����, z~����5T)V,ցg�zH���
-O�����<��&;/	H
s;�V��<�'r�k�o��|���里��:��VϤ�[�:��&락D=������ⵢхZ�
]<�i�h+�&�(d�2�����y�M�dF��Y��6y"-�a~+Y�Ң�#������q�>_F��ZB��*�4XL�S����{95�Qut�@)���s=�����|Ye��1��I��}�:Y����vRD����1��8�w(Ở�!;����v�HF�0߱G��F
!-8J4��0_s.�05i��
����Z�[d�r���B^'��Ms�U�MK�_�J������\�X�z>/�fNXȞ1�(Fӹ��������I_�\�����9-M|ć�߬�\���N?�����=} ��
e�/��tB�$m���*��{0������޴ %��a�]t�F�[	���ԣ��dô�O�Q*1^�*�$ɾm���hD*�.~�H�Q]5.��pM��������gE���D�4v�kNO��8S
��զ
i}*�WkȈ��𝀮^6��Mp����x{���RW|Q��0Ε��9��i,��X�޳T8j�^j��+
�"�?�h��Hx�Dz�O����'��`ư#B�%�n@� jL�����)p�_9��v��-r�����qS곗�PoǴ�;	aa�;+���Hf����J��HSu��!x�����o�|��P�����g�K~8��r#�bI��F����e��0��/>� ��wm|�{��\�~}����W"�m'
��e�H��%��Qb2üī�cɌD}W�)�2�R�ۮq.���w��D���,QÛm�E� ���tS�Bݽ�S��o�5��PR�:��6�:W�h��
�(I;P?pj�����z��~����#�u�:�C�Pz/�#�1�����$'1���9����mM����c�&tkr�>#�%�b ��Ș2qO �M�?�dC?�t���ϫ���d�	Q�=$	)�&
�?��t�؃�$�Ѳ(ez�s��d|p(2R{ɢI,����6&�k�S����8b��u�x4�ߩK<2q Bѐɢ�N�ґ��9-^���:�
�Z�8RGQŘV�+��9O���n�y�=.F���`f�j(+�6�l���	0���a��͏�"UNS������h�<�l/XӅ׻�(��v��G���=h4ɑ��1���޴���lyS��y���ܺ0��e�v
���,����:{d�R&�����404"�)�Hp������������S}�p�3[z7[U�G�����q^��p�ƬG��R���t)G�VSJFTABU]R�L}���gJZ7��C�4e@&Rдvw�
�zd䎛�ɹ=f@{�@i����Y��F��0��9{wy�M��ـ��OW��nGjt&y�O�!����@kk��]j�}F�+?�P)X���`���Ak��w,xo���w�,��vj���=
�Yv�I��R`�x��#�'�x�B�V@���<
W(&'�y<�&w�"!.��������Ɵ9|�yp~|ZKʵ���e{��g-"��x�`S�}�W|�䓫2�pM�P=��_@����跆
�+PG�ʙ����wW3פ��pԚ����M���/C99p��@�<��j�+˂3�����K@
��QS�a���n滛"ănV8_dҿ����;��姟+	/�҈�&���Z���`���w�"�� 6��5:��O�m�ȉ�f�ru�M�)����ݾ�Fx��xeF�3@�%��U�r��V�7L�yV��*��z��_�5�Lܪ��#�-4=a��O��o����'\`��ݶ���럯�ܔ���n5+�E��\��z��8v�E"�f3��K�����-i	���J5?�!��"<�'��<o�q�������ňH򁘭�l�]�M;��34�o�M}zj9f�Q��՗���*N�o��n��$%OU��9r�|��3bj=����_�
��־�����Q���s���f�!��������G��x��\1h�"
����sH�*�MvX?XoC���89�+ ؐF�ҥҔ�[�)�Ζ�[�~f����D<,���Q&�c�"u�p��a���C16��O��<VVE(L�s�GdW�Jy	O�<���\�H[A�~���0�.v�+�����8Wr�ʦy{V�ȄF�GK��?5��E/�F!%�"w�M������O&#��#Ǫ/����đJ������
�
�@r'���"���e��>��5��# ����Gzx.��Z�k�?�F��eV}
4�V�Ԣl_�@��k�_؄*��y�F�1�-x��G�U٘%�㽔��wAO}SO�X�3�4�t
�u�_���¢�U��br�
M]���m�0�M��c\��ǀ5�Y�Ikb�^�����9˘�x�J�*���~��D��
5K�ъA �A�w/���ӰnW�EZ���������&�9��4A=�؆)���M�b��(��@
�����K$,�ow�J/z"`��q��G$�T��̟mN
?v�V�	�3�G-Y�T�a�@;�$O=ͻ�h8���B��g���c�H��8nQ�?��Nme61e��Iv˽�
,Z恀!ACg?��⠬�S�
��ؽw�IUN���+;hOS�N9p��r������A�����ʿ�C��>�_IB�FՁ�@�Qw�Y.�ꍹ��[��" �����-$ޙ���]�_�XX�
�,i8��l��O�˛�����Fc�m
�}�JI���`��iu.����+?\��J�$��StD��w�Ew%¸gɬL)�T)e<H*+e�I���Ny!)ܤ�&S*I�K�Ń����z`���zu�ɉ�����)��^��GeJ 7�
�f�������ϖHȐO5�Sk�V\����3U^=�i,�O�%%m8}�>R8��4mlP���	���u,�A�T����j�*Z��� ZG�X��9/�3R�U}F��Ap�q�9/����fk�:"hl_'������+4��3�_HP��]���QPQ`�� �%)=�G��<�c��p%���fD�[q��fV��f;�ͳك��4 ��s[R�d�h�3X��
{o�_�=
Z Lr1�$G�v`uڍ�Xٽ���×�X(����\�*~�#8Ai�����I��@J8��5߆��\5��3�q���}y
���s��ѬۉC�1� �*�Ծ|�5nc������Z}
��О��^_�G�&Z��Xp�])4��VK�;A�;'��LA)}�**)^�7�m7��ZP�V,�'in�:��V���@5*o�#����i�k��}��\��Τ�͘�T���Zd�#X��(��9�a��;'7��1B��Y2>
��ر;��n:�O[,��m*��:�*�\S�{��OYȒ{=f��0(�=���<ׅ�=��z"nHN�Ţ�X�^�L�
^��7�d�qɷ�"��d�k���$Ǫ޵����I%xW��h����]�6��=��pt��"S#"D@���,+I+2���jU7�H��Q>MW���3�� �D����F<ŁM�Y�~Iv����^��������F!�q���G*��j<��ݺ�Շh��}����5x%�~�W���i^�%?S@cJ���\UAJ�FO�!�"��ع"	�_��d/��}�����J S��*.���$Ɔ̨�m��X�/�T�*�X�[�Xc��m#��1R-��aӞ�
�[���	tH�D��<bl��z�Ef�q��.Rw��m��I�Wj�`d>H��ݶ���qɃNe)���X|�y�љg�S|\?�	�Ek�v/������N%�"�.32t������*ܾE��f��tK���5������i�5AoO&6Z��ͣ.���z���{�:�)�[ZN��:��k���,t
?�?i2-j�#�8&B�dwӭ�d/Bgk��/����\�5,�f�
�ժe��a{^B*�u��+����aw���y5�D���
E��޲�����*�["���zLӒ�!���w�`H��w�g�=��gX%k<�ǰ��PDi����N�𑨘;
��2:���O $����G������q`�7���ItJs|^������@UI@I�]6����a�ڌ�UFj� o�ѐ�W�&�������0�`}'M�cЬ}U�A`ԯ�-�� ��w7��z �b{-�;T����G��=#D(<�,��W�����&��
�^}�����o��
�0�m�b�$H/bd�ڌ���c���{�1���������9��Z�U���\=+�E�S�_3�j������C�{��R����	
�v����ᐞQ��FF+�r�5����n��P�ճm�"x�dV*����N�v���\%\%��  P��2�n��Ĵ'��p�O���=��J�r�סL�����v�I eo�6ķ�R*��2���R��7�"�X�(����w;�t���N��OL�܂�+Ƣ;"�-��聈�AP���7���#��֞t��Z�P��ar+����� ��r��+���}�c������P���X�w=L�WV�qg*됴QyUh3�� ��*���{�0�$�ʼ�vɸ��˕�)h���N�O�]��$� �'%cRjr��~�n�de�U%t�F�Kp�U�i�L��,r��^̔5_v�$�b�;Dì�x'�-�9�Yˆ��wi��J��<�N(�%R���yb�B���P�tC�ۛe� �!��t�_��`��L��s��?(n3�Z��y��<]�,e� �5�֟u�����q�Y���SZL�w�x��n�`��ƽ��X� `�)��FJJ���(�ҧ<�%�$��"AK��ֹ,�� ����! [9&֏�d�R+�ф����Aj�QA~23�|&��Z
V� @�ͥ� �d֬�4g�ܨ;)�e|I�e��4W(��iD�}�Ri�GY��
��o�ا]]��Ӷ��K�N�א����jL�e�4Ou�ILAi/q�y�����{���&#�@��fd��~�3���9�o�O����[�~�o#�����wL��@�XsU�22��6� ��� �,#�W-�/��o�d ���>�3>��/)�����"FA�_^�� �
6�$�)�kN+�
#Q�����߆e�P�ն���^|�M��[�$���� j$���DC��	I/,�w�sc��i����|r���)o��P��|��j��0N[�ܬ�[�Q��j���w��yע��ǁt������/�fo��Oq�c�(V�Xh�
`���A^�HR6=���qX��K��DJ���FŦ.��QХ��6%�ǿ0a�Ju�����������@;O��^e�z��:-���v�����㐼�?q�d�B��Z��h�|�Pܾ�"�"dW`j�Q
��@�մ��c��X�����"��F�Nf��~�$��#�Av�Krz
]�<�n?Ѝw�Av��i�Z�(�J�{�R�f�cv��  ���3I�$�4��b��p����?���bh���Oi�����=���U�)���<�����H�X�g�n.U�Y�|�+��x�;p�+�O2���=����Z�z�ۦ����zoI�G!�&����2��
_W��`�Eb��K@����MWנ���e�=��ݾS���_{V
�Y-MT�r�&Id�	�G�{�
�e��qA��syY�6�k���v��dE�
�aB�\��e&ZY9N����q��f7X���V\/ݼ��a=��K�2{�����B��\�_��1��LN�@��5{t�omZ�fO���Z kAѾY#q���L#a>�$�~��.g�/5E.�i��Jc��/��� j�-�Ɏ�BԺ�{F�dttl��'�?Yt�'�꓏6E
Hy�v!I��XW�hx��f�Dt��?l����w�C�q`��Հ�N~�2�^ʦ�Z�р��G4���I"�Gw�
�@p��HͲ�.�pIe�f�6aLk�0�/�pg�v%<W�h����^�e!Q+�D����Rn	hWyU�݂R��IP�+{�w�b��7͈)w�d�r�IL�eO�X-�e,�Z%f�Γv�-XQ#d��^�I�j ÷{��UW;�2��9a�x���=]��#VVe�`�$=���pC�
4z=syO�ּO��Ѭ��������ɻLɡ��X��{���(6J��eݴ˭����1��ή�n!��*e��gIF_u���f+�'M�3�3�}0��Pq��
b |�L��h�ѫY}M/4n���xj�T�%�V��6�_��n�b 8@�ۧ�0�(���]o�,��I1oWvD
/�q� bT8����mn`��)l@�x_-����\D#�햼�*���4V�Y�׹CE�∈э����l�f/����O�����e�"�.?ދ!���g�L�'�P�,���an�T�(ן����o9'hlt&,z\�+�{U�+���k���l�k_�ܼͣ쩓�^�e@QYl��&~NO�OXtd�=K��Ap�t�Q�3�Q��TyI{
�!N�S�s��S�7A$�2�h2�U�~}��x�+�_Y,)���2*{wq����q�z�Zh+�)��">y�2���/a�6dLh��1~ژ��$&��
b+ ��n��(�zG)j���~M�@�+�!����7"p�n2����-��x�F�U�Ч�M�V�0HZ=�eB��ӕ��������]�y|H`�W��I�+ǟHN�#�!�e�-��py��?LF��1��<�Y�����@yd�k!i�#B(��c��mrU#޿�b74B�/Gp�R��sHΌ��h9��2,PD�>j���X�WCĜ�$R��()p�$;ٺ6���L�b��F|���A�(���p�X M(vn��E,��c�@ރ)�u�Nw�1!8͗^yF���b|�R���q��.TP�y�Ċ�
� �����9s�%���%�?�ͅW�#k��%�!��2�B.�WH����of\����kv�,0�^:ő�a��@w�Q駂J��o�WkW
m�=fʇ�'F?��x�p��@�>lS�;�B�?a�_�f�,�n�.����zy� ��+˧�3j�g{�s�q���Q{���r�[���L�MT�ފ���!��N���NL��)���+y�oT�ɲ�)�t��{��c#
m]�x?�TPO�V��Q"Y� ��0v�>�PڱVE��Mh@I��EK�g�1�j4��PY�|8��_��F�����@��7������sAC�׮����饞��D.��=�G>���$l�pF���=������m�K0���L����U��<��N��_~'&5�]��ߌ�g!��s��'�����8���[��o؎�i �x^ΌI�!ޣ!����h�]��
�6/���wg��X�N	��5������؛&Q������'v� $F������R�/�!W�����:��%`�:`��_|�m�H��.���3�&�������ۢD����"t�AaF�����S��R9 �����-?��D���<{g��Y������P�FP����d^�?I�^r)����'m�8z�����GL��V�wy��
�)��=�L�
�'@ziT�櫻 �Rt����
��Z�R'�� 9[��" ��Ѣ�ʼ#������E�p���L_k��zdM���uw���*<�u�rˀ����z�,�2�ZS�U����5@2[�o}�{�ܟ��I�\�Kr����ֆ-���Ek7��+��U{�P���䍏�NYl\�-?����W��O,��%��;#.4��/��l	7����O���wU�� ���ft�����&v��*�/[��_���WJ���ꇔ=vI�@cd��C
Ftk���S���f)��ڄa�b���w�L�&����Ɉ#���v)���(o�|��]�|� �&�5�F\��e^�2����p�������$Z�LX����f�+�}�Wn�:�j���PQ��K��.��
���������(V-_Ϡ;G.;ԋ������d%�H,����m�� ������Ԥ��s��Y�\���ު/��	�l:��c��d�ltm�Z�<-vȠ�U��R	Nv�N*�X�9'�SF5[y�d�j�����5Xlt:nx���
OZ��3���L��-oM;��0q��K��!�Ԗ�o�m8��B�_o�l���y����bb�-
{�� ���`B�"Z�O�
���:�6Lf��l0Ţ�%Qj�����>ˌ�DZ0[�@a~:��eSH��ѷX1��Ps��N �w�&�	Z�	��]�+ǌA���c�g�����K༑l!R�*�?�:����SA+p1�_�������:.���#�vl)�Oj���&��g���"b�9��`9R. ���r�k���z�ғI�6�*_���'�n�)⠈2���k�kqm���<��М~n�,�1�k��� ��#���(C�*�]�o�)�a|ɲ��f�����ư����L\i|�N��Q5�{thJ�
�YA��mU�O�d%S~�,q��"��ު;CG��c�10m���yN#?MU�J9�´�B�_�ǁ�ɍBA�_�s
�Y��,Gs^������B�������� �2�QV�\��_}�w?����x�@���^�Ī~�#�ȏSK�i�=��N����u0WZ�~k*�_�EF�N��w@W%�	��NE}m8���Ki����k81�o/����8�FE�ט�;���=  �wwV��6�9�:���p`g���"����)�
ي#��x�F�X�;�_��:#�i1t������م��&n�,�wQsS�n�^J�GZ�&�[�����f�yd����äa�fqo1��i,�/Q����w�O�+z�M�a-	�\����!���Db�Ά�a�ƾ�w�|zR�z$�8l2�u�/[ �*�ͼƋ���"/B)��a{B'����Q�N��Z^�*8��FS��k��&>Em���i��R�s�n5]'�����v������g��	E� /~n*�pd��ɱ����`��ɉx�I:��ٻX�v���f.�Gm#�~���[�<���*Z)�Yk��x��?�֒yG��s��VA-�'����=a�˧�dU*���͝��K�QM�>k[���j����k%*��k,j��Sn��=�E���@c>��5Zb�_��A�+��w� ���nnM��p-��H+
�)��zD�/���0'������FD
���MDQv���4k�:�?�C�w(��,>�]a=�U�L���o_�

�p�Mu/�u�������o�ƿ���޲��#d�7�dGNp��ޒ�4-��25Ɔ彞�M��`�7��~�d��}�8.=����(�Շi���ȣ-�o?d�f�kD��ix�+^�j���)l��������� ���՛|�����ҥ&�s@�
2A��h��k���NA�S�c�]�s'̼��J}-EK�?�&U$�Cy����#�)�磋���Q�c�0��}���K��=tGJ&���՛��k�y�4��o�t��,�~U�&�Ϙo��6�C�Ғ�М�������QtC�`=�_CF�՝r}qq:�V�VJ�v����#z��չ�Nv�Q��18�c��_�T�P'ߝ)6 B�)�u��ۭ �^+�;�!���DC5S\�/=�&n=���������Ê�X'�\�*�U�%^�-�����Ӝ�ϼ�3�����X*��VѼ7��,�@��7s���fy���9���g]y��7H��UF����O��sx�/�a���i�6 U�N�𺨢e��	h�[ ���������W���W�x-�$�g�š��W>��2���u?�������� ʭ�A%;��o/�^�&��«7K[릵z����M=9�?Z�����V?nlJB�l�L��G����g����w�<��AA7�[7�q=q���?oI�Id��ڥ;h�-?��j�ܜ۱�"�!��O��#�1�|�~�b����kl��g�xg�>�]��S��Ki�e��,��-�$9$�N�yd�r2�5�tsf�~��:<��)�ƃ����
��G�Z�$��Z���V�� ��<
�>�1S�罯C
X��
p�I(�q(���f�����������EA������W�F��d?�� ����v��/�Xƺ��l���@$w
D5�niO��YΏ�+F�0��[���G�N���[Q	-��-�GZ�>���.�%Ӳa�j=�BB^럞�"�l_yѬ�)�M�u\�#n��y�;�u�*t/�l�x��`����1E����)��6��0pc�к�pK�qmį���6ʶ��:Η��(��F,�b�����2h�$�\pa�kyV��������=�w�?�qc9���C;��QH�s���fa�(�Q
u!��6k:��,��N�l7��!@B�wj�}s߭��(B��J�x�� wVr��q}����&߾���6��:��
8[��c]��k�����|�����
�s��C��e2G��(@Rk���3/����g&]�|0n6kA�\Ǫ�v��xZ��z�tׇ����x��rb��LS�L��(��ӋN���_���*33N�+]���ft��Huc�[�Jѡ��� J�+3� ����Y�imQ�O#��T�S7f�Z��9��p_�=��c���%��T�9 2+��S
#r�V�����꣸#ϯ����K^5�f;�K
Q7wS��\� �-a&�ь��o�
h'�~���ЫA�X#���5�	\Z(�g
//نܫflH����=2��s���]�s|T�!��������h(��`n�u[	(jXi�,�+UR�^t�ܼ_�_eσ�L��]��(�qG#���3IS��Kp�6�1�������f%)���Zջ��\R�ˆ8�$����9���>t�D��ޤE"l��t��*��QU��<3�E�*rG^I@s%!Z��#2Ux'��<d��鯧V�	�
�>�4
AS�1 o�KZ���0*e'��#�
䶎��ʁ�Z�����T�\t���dnAIݜ��[U�r�*�H�mU�JB�_Q���c�Sl�/<݁{/�e̡`f���#�:��ۋ�ՠ�$�v+�S�R|�J�+*n�֗M)klH�����7,���dO��G�o�7V꾩�WNv�U�T�>@� �a*&��M��0͵gm��[�.�%�S�|�x!������a8$7%V���\�(@$�8������|[���+
���ZAU�?�>�)�^P0�p@�����`��td&��Vk��%'0�U������>)�`57*�}tC�����W	�f�.���)|p�3�z�Ƅo3[2;�_Ѽ�Y&w'5 �K��i��K����\0̀+9�f��x_YJ�_ڹM�,��P��"W�a���x���
m�C���K��l��.+�A'4j�͖6T��Z�h�g؛���AT@��Gj"�������+��5������d�,�
+ "+��=$�	�s��������PS����,ϟ�m�(�M,��c.�/�mZh�bU�-n���4�?Rѳ%��!��_����j��D(�ۈ����6��$��A�`��A���!BV�U������EB�]�CS�aַ��Cp1T?3(\�)
�.�0��uR�)�����maB��M��@9�=6��� �J<�(1���5%*Z�A5q�Xb��q�I;�a�5�/"��`@. �n:�b@U��ܖh��'HW7�T�H��@DN���
���j@0��r�U��e7N7dSy��W�vG_�lW�AF;�^{�k��kvt�9��
IF΄�pt.ƀ���	��6b�(��d��Z��԰������R��Z����ؓ��B�3�L���k	4��j���o+��g�M�X �c��^js0�2��!�@G�R,0�"�(��-C�[I�1��\�0�i
פk� y��ʷ]�7(xr2�׿�η���J�{,E1B �'�V����Zi�aP�e�Hm�zFtHI�#> ^�j�m7k���@BmSl��:�4��$��Dc�hU��MY�8�CUXL
��֬�FmVK�A� R
Z� ����[��80U�� d�D!I�]3sT^��-��r" KLK��-*�!�h�HԚ��K�������i�f���j��I\k�������Z��!�gs��B؈Q0
m�4gH�q(�˜J��.}a7L-�Q[���,�����Ph!��{�zm���
������(0Z��4��"��;�r�J��S1\���;<���P`H Y��ޔ���#�U�������ߏB!�q�K�u�O� `��,�ۜ��[��њ-P�r�XN,v[A]��iL�`���M�)W�vɭ q';]ݜ!����$
2o	&A�ИȎ޵)�c^1����ETv)�������}v�Ph���2����K�O
|p��d$՞�Ҙ�( �rH]m��H��kI�� ]�<F�z��K��H[a�/��c�o����h��L�+��W��n���F$�4#��?�f�e�� ��7��bV:A2�q�\�\9�ے�J?eVZX�+�"���!��3ӷ����X�(�)�\j�؈]���LĚ�翽˨֘,�֬��|;+��o��7\տ��L�Y��Lɡ�ĩ
�a_�Cuֈ﫿9�iRo�:=lr�8]DWjsL�~�� 
�����,$+!�b@��>a�4R�/n�c��Ԅе���y..��v�s6�s
��T�s(�Sȋ���V0��U�R9��9+�ocz��?J-����7���u���c#�!�2d��=L$��oP �kF�pp!��a�����Y0!	'��׮�U��8�ˡEQrj�p��/0�M
�w�חp�Ϯj ��y-��GCc�[�i�-�GS/]t���<$��+{�v����v��w��t���t�iS��0�XbW�V/Q�y�9/{�ȏ����K���%���;�4jP�D�666�	��(�(��Lڡ	��D@05|���UV�>�rI�����f.�V��.X��i�}d2��뱾���4���a�bdԎ��=`e�O̭&�'�7!�*11T
�����k��

��9t�ޮs�m�������!�m�^��$��:u=�s駆(�&�$8���QHߺ2X�y6d�o	;�ï�X~���]0��p�w����e��˒x���$S���s�#�#q�?Eg�޹�A{���e�$�X�R�1"���	A����+�����*W��Y�m@'RAt�n����
j��n��s+�V�1ç
R�̃��h������]s�!Ƞ�Л�Ð�P!��\T���Kʮm�P�wr��h������Oğ�]ǲ{��ӱqӕ#y�	�S���@��ɽK�^>�g�N��m��A�*툽���1:���fL�[��s�$�^�ᾱ�4����ZbZs��������aGz� ���U- ��5y
ܭҰ���㝖r�[������@:)�.����h�}����uK,��[�7xWV���f��.1�m�=��k�~#�2�9s%dpRU)6��sl�{k�cf���=:��*�U��FB�W�Q)� �(
���EU%�Q�(,R�Y�hC���uR�4�,�[��%v~ ��Ǆ��B��r�љ@)�L�D�\w��_e
��C�i��*�ys����I�J�iejl���%q�-�f�����%�b���e�7��#��/�j�y����"��BX?���_B\�g&b1O�Ćɍ��>���-���>q�kهݖ���P�>ͮ@�~��E��F-
~B绞e@�E��]��^�v��gғ���.y!�,�˜]n�5�S���@�$�D��c�5��9��(E����y�~ ��l��:/��H�{Ɋ����Jly��!�rMJ�ֹ�DAp�k��C��edU�#@�6T�$�0���܋�Ah(��$�&�:�d�Q?
� �˾fN!OZk��H��[~�m.BjjQ��܈b�	��ٞl8�-vzp?��5�8�B¡��y�e��`�nU�a�.(�r�>H��
H�,��Ķ5�f�D�a������,�\��v��[�ؘ��X��{�7���c �i`i��*��6%}��
7�qqT��+<�Vy���b�aDNz�f�BI��G4T������G��i(!���<�n����*��=�4r�;>֠�e�V~f�(���9�E�/���
��4�.�5�R�b�M�����n�ú�R���h�+Rt��q�dP���L���]T���n�E�W!G��2���3N]S=��lPh��R�$�AZ�;J
���W_EA�d��ۂ=!
%����.�� 
h�vǺ�4ݪV����&�/ՠ7o�z�[����k�A�-~3��T�e�Q�m{u��B����ڪ7�8�6��ڪ$�{����w�p���鰅$Wp�"�2Ok�">�Z�=�,��"%��(���R����'ƅ������r,ȑX~-�=��ӵ������|��~�{E�����H��4�8f|m�}�u�y1	RZ��ܸ?�R�����a@�Cm�GE͌k��iɈ �E�#@�1r����!�@g��|�Ҽ��1����=���6�	ֽ���
b��3���'�i�P�U�v"fm:K���]�Cq��mx��	m�lH��piK^[B
��"�����ή�X�6JW�z�(̜���n����
T����R�����QHU*�VVJ��Iq���h��6�0*'=r}/��
Og۟|`5������i��|H9����f ��.��.�;��5�X�p��9�
�[��b.�#���[�?9��h<��c�z�Caf巐ޮ0BwhS?�vk�u�ox����`�����047ݢ�a�+5��]�aMok\�kK�␎�4�2@A��t�^~�@Y�,K��|��$w�>��Ie�6#��[��J���
\�BQ���CJZ�R��G<.�t�!�?kݱ?�+��n�_݉��;}~5��t���U
dU3$ټI��W�U�#�>Wڤ��@i��x���Кp��>��{�y�M�D�+lL
}1.���`)d���	8�F#�w��a�H�����r��#�uy&D�`�� H$;x���3��:t�_5~ld�Ԋ�c,��H�F�|���s5b��F���X
"W�MMF޵? ����71X�pHT�%ih�f&��dvQ�o�\�a�/[n|#����������~�GX*��}^1P, 7�>�6��
�s;�D;UY�#-S�E�h	��^�e��>
�m��\Q SY�/��,�:oc�6�)չ{Js��f�y(��I�Y��#�+^���fG1�l����ٟ���P�;߬�@7�  ���2�_���S�mU�=�8�b�16����x��J���
)5ݴJ
�b�h��D�R%������+7=�wh>b)���`�$pJs4����r���?!�E8V���7URG�\_PzB<�W����@��E�׭�4�x�k	GL����t1�%W���3b�@�@xj�ξ�8�����O�s<J�T�&�շ|O�<�<$p�����$r�ILB���joCG�0�&W:��1��Z�)��~�Af(�S7Q�|^l���� ��z∝����XlZ�8z�x\���z�vy�W4_�����k.W�� �h�1��i|��*U� ���v���z
��8^�P3p�����:g�ʮ7IG�T�E��G��d�p���>���b�u]u�P!�0٨s�4�ؽ]�j����(p�V�����d�4[�j,v�zR���/]8��tEgtr('�	ߌ`'h�iHV.|�ݫK����*���4OH��:D��NH�2�Z�=��&G<�忞a�:$��5]g��/��^>:��34G�B9, ��;����~�.����N�_�B���w��U�I���WMi�l�y��\Ah��B��@1��$
b�ߍ����8�M��qI�O�;�cL6:tEl�_$LSgԥ�ӱ��`x
��m���?���F�p4�1G�b���}?-�.��:�|U����� �r- �x����\��A&ⶄSV�7��V��Š0 ��9��N���+d��?�g䝆)-Vϖ]��RZ�4K�U�c�AH$N $����Ig���JN��x�P��3P��f��c��}���g��T�S0|p�*H�S�a�����*�2?��n��#�������W�Յ�b�{1h�����]
���Mi��X7�ϱ���Go�:<>�������B0 �b_�a�-=���Z��Ĩ*��1ܯ�8-ܗ�܋s��t~���U�.	j��Gpt�Xc�kg�������P  c��3I����`͜�|�'�<��>fw#���G{
D& ��Cn�s:��wt{�	`�4��䌂�.,Ćޚ,�y :$��j^�~��_<�7�l!���:z)V}��@h$QG�߸g�����1O�hW]��}fv
4��i�4��.�������h�AN�nZen����a.�k9���.�GL8�vv�?��@�چ&��;Qv�\"o�/�-k��Ӝq{�Z��-��ܠ�'�А�PS�+N���7U�	��4�j�-�0��;�}�l|�|�"��-��.�Q�G+���˵X���q�%.;�s�L�+�J&h1�N�N�X��t����)V�c��p���m��s�{��<@��X��!�ﱌ,��G������P�췋�K�� uF�m�~�K���WgS�3HXX��,{P�:aX�����}��^�9Oi�֟n��!�;�7��,�N,���� ��8~�N~P�H��Evń#���Aޕ�>��C��������>x]V!��o���MU��,�(�[�ڝ5K�����`��c�q�8D�į�:V�A�J��_=���SlY����<68{�7
��1��8��B��Ce�列�����w�!�V�4�������z��<3n� wgS�W{��QWֵC�%i:M�N���&S��r#��ZY��>���qQ�.��^�����S�c����{����aX��S`.�0�D�,>�4� �˸���u+E��?�%�I;r��Ao���AanV�Ԋb�vO� R@
��yc�0G�H���:��K-TYX>�)�-#=��D֒X��T	t
g^�,��w��q})�x/�:{�D����W�
w��0��%h����ρ�SN���'a�dw-����p8q����ar���H/��9��
̑���ЫsL�:;�Hj���䁳ɻT��~�fzĆ?7����5��Ġ���_G���&�^��/��@ F���x=�"�Roq5�>9{�,�*����d����JX
޺OE
�[R���
�L������;q�4J��/W`�B7�<F�=M�8�
����ee��l�dM�A�as辟����}.��z�/M��ݵ�J���]Wѭv��s�/o�*ؼ�az�*�S1�6�)�f����b8Eِ�hv��᜜�W��C ,�s1B���
��GZm)��pӟӀdylQ�-�Y3�Q�w�����l�I}d��h=�dU��g��G�	��bo���E�]=ȭ���&
%;��Ca�U�P(�����"�e�%2��
��_V�Bl�����8)Ѻ��>^�b�*���F��[�z��;��O�bù���g��O��y�]D�5�[a{%i���q�����24���ɝ2ES�%�
��%�(u
9=��5�Ӂ�fL�)K����xHOݰ�L�Ŝ�҃��^�Cdl��A��R<���Ut]��^ �sV��S_�)(�P��MY�[(B��N5;���ۍ�6
APZ��L���i5L��asp�('�hBY�)}����	��-��*;�1�W��~e~���ST� 2�ex�~-7`�
����%CE���WD����P)&�ʸag$��|+�}�Uc1��(hY�adS��Y��(��m�\pfߘl&{B�iQ�C��}�Y�[����:��Hݗu�[A�r�2 ؞O��Z0v��\�e� v�p�7HKJ����>���e�Z�� P<T+ ���u���EBF,(B����H����d�׸�;�ax�E�[A3�Y��AD��j��`���Z��^T���ٿ}���n���!�4$^nv�gv))t8�r��H�Cvy���W���:�m��?�d=���s2�A�*�]��$����u���*/U��Z��#�1�I�ݾ���cA��U="���䁫�n�uER7�6~��6��M�U@�����=T@�d�廹�#��we�堑�s�Ew���|�)ݴ�y�  A�ݚ����e0 '�d�T�J�XI�����IX�-σ���&U"x�����P�Lp..J������A"
�)�M6Y�y�>5?��%�_`�*t[�xou	��޹�����M��̆��+�n�K�2n�=��GS��ľ��0[�?�p)�W�h�
��)ix�*���I��Q���ўP�;�4��WV�*��uy��t��Q|��i�32�!�h\�8Off�3W,-��^�N��s2�d���ɀ�p1˜�"&Hi���7h��ӡ䆰c����i1N��t� Ũ�'�
�!�����D���cŖ+RU3u���Z	]^�k�᭱j�e!b��U�.���#3�@����X���Pۇ��:`	��;$�~O�u�'ϝ�{���}n&��,�ޘ�;K��V��SU~x
�1��op��$�@��U�X5}�+!�o����)�)�V���t���d���2G�W!�&`��|�e��,1��� nI��z�D���g�I��'rX�|��i���4���S��Aj�
�2�d�
E�ķ�@ċЮ`dI�z�|C�1}[�2�y����{��7���o�H�U���B�_*>^�L�\pd��J2�/�^�$�汏�:p(6����.'��Y��c�J�#m�^�/9�X�l���r<��2 ���@�v:0��r���.����Q�q����>����^�̑��G��f�ݎu����y��`�)хN�q�;�X��Y����
����M�{���F�!t2�h5��ĕ������6��E�4K$��o������ՋJ��@1
��ǖ�S��T}���®gE�-g�q��P�mD�*�}��3�CH����z|��*Z�v͛V	=9~�W��l�����C'S.�s��4OUa�.�HC��cZz��h�!ޭT��y��`0j��l]C��ovϾ#�û`�$�l�F�����j�Z2C%G%��"���>*��~o��X��p�C��?hz ������u:ٱ��#�Ǆ�n��#�{�ܠ�1�f]bJwڨ/
x�M0��
,�^�� ���%���E��a�U~��Q�(V��h��d"�E��jv�jQ�C�h��R:#��M��n���Jݢ�����Fջ��U�!�َ�o����.m�M��,���uGu�.�YyW/Ô=a>+��Ow�nLf�MR�Jbf�w\��8�����>�\���+Ao��e�e/-�s5^|��P�x"��������޵�OE���V^/,8W�1@���x�I�SV�
�� ڕYjD7��Y�����c�Qh%KF���=�`: P0���Cؼ�5���08���Cܤ�[��Ε��l,Fn<D=��$�N�/��Z��꣜�5X���
����!�M����+�
h��Qa~._O�ҭey�H�����M$�xZ�F<ﲱX��B��8)�eRƙ>�p^*�4x0�<��~��*���[M.�E3qz����:��^%�_(=�����P$??�2���ϗ��/1a�sq�j�.���@C�d��

�t���ԨI>�
y
tFX�a��V��8��60�4��&�a�d���qMĆl�+�s���~*����.⟣{�m��rt��>By�'�2��`#!��d�bԁ�$
���=���G�2ɶ9^\�7KGOo��h���3p⹙[�F��Yq�)d��q��
ȴ�1�|iM��~#Vu�l���\`7Gv!���
�&��2:H������~f1��.��m/�� :��4�� n
`��J���	�vt�L�>U���e�3�B� J��'9�;}���4j�U�d�'Қ�Y"i��I����%��H(u�t�ߐTH��~@�.L/�#�Cr]���Tb��&��͒�T�?���?�� �d��Ȧ��StY5t�"i7�SU�����4��O���;��
���P^ �t0{C�Ef-@�G�@SR������+s��UD4L�t�u�K�TL4UHk��E�ЪN@�Q�W��(2�-i�X�ޮ���ʲ�;�F+FP����T��z�.�AX�%$#��8^��i�,K�4�1e�ju%��������&�'�Yp�G5v~�sp}�H�t����o�t������d�.eS���Q
 �D�
��]�y0�1�{*�4
���B\CF�zZ̕x��yl�5�J����tu	!�Ui� ߬C��d7=��3QY��N��D����E�Z�i��WFH܀��� e���eoz��ߐ$�q4��f����&
��j��A(�q�5��rt�$���B�S��mE�݂�ҍH��-~��#��6ˋ��Z��Qפ�rI���J �.�3��;D�u�[M��ZƄ�S��Ūo�ؑW��~���r�����޵��pX�����1��Di����/]b��8}�F^˗nͪݥ�3Dj끙��ɏ��|�!#ڢJpv�%?+�y���h���A�]M�B��O��Z҂G_t�"��ufV΃��3���H�".7��hc���+V-	���5���?��c���+�(}�"[���ͻ6͢������X�������p[�#�s�>Օ�7j��E�#ܗ7�|� �DY�?h9�1��Κ���=��I�' t�p�e�k~�!!���CQ��u�F��I{��A�s�/�I+2��0N�ɛD��Y�eZ}��ZeՙŠ1h��' 0]u�@?�����h�k��##�ͻ �J�?�.+W���ʄ1��fƼ�6�����2���nˁ�D�I���O�������7�m�T2��zɠn���1�f�H�+:{UB��ŋ��W�w���'���FR��JKp��J(�2�Dq��c\zFm�[e�[�+,s}���w����a��-����0k_!Hᐨȫ@�9C��&�~ec�7��r3��'�E�ZzJ{�H&[jZ�As��S���m��|�@ƹ0�G\��B�{���P�%&
�³���ѳ?��D��Eɨz���� �
<�)~U�itj9&A�G�4���p��pl�-���'tJ�^��>W�W�92��d�`Et6 �a(���w/�'}PLs��3�u`y���o����:��A���Rl�(����>i�����=K3�c�,�*����ґ�+��ws�/�����3\;���/D#�8�鷵_�����@�UZ[vۢ#ڙ��O��2�u&�>�Řp�Qʗ�����TH� i(���M�S�\��h��XJ(����M���!�!!yY����zD>'��[�)��0~<�Ɲ��3
!�S�.�J��RO1 �1|2����׻un�L�*> �cuM��N$dN�ɚsYe�&���n�9mc򇲞����6iB��,�~Ȏ?�[s�x�h�`�K.�7����$̳G =B��	ɫ�
 UQ�1���\�FS���C/��^|]z	�H?b����-�	QCw~#��3���aD!�*}�FZ����H��Nr�ö��Tt�Lӱì���W
с�=w{��<X��37��������ڶ�%�z<�*$�������;o�)�K��(���u�N/y��ф]��s3����3��	�=�����d�	F��>5'��A8�gP�b�N��� �ۗl��>�s��R2j�g���3`Ճ��׍f��!y�9}��Z��3�����H����$.�������B\�W0H��z���;�R�T�'�����#�=����0��r^��_��lLrA�9j�K1