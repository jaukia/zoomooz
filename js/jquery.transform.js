/*!
 * jQuery 2d Transform
 * http://wiki.github.com/heygrady/transform/
 *
 * Copyright 2010, Grady Kuhnline
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 */
///////////////////////////////////////////////////////
// Angle
///////////////////////////////////////////////////////
(function($, window, document, undefined) {
	/**
	 * Converting a radian to a degree
	 * @const
	 */
	var RAD_DEG = 180/Math.PI;
	
	/**
	 * Converting a radian to a grad
	 * @const
	 */
	var RAD_GRAD = 200/Math.PI;
	
	/**
	 * Converting a degree to a radian
	 * @const
	 */
	var DEG_RAD = Math.PI/180;
	
	/**
	 * Converting a degree to a grad
	 * @const
	 */
	var DEG_GRAD = 2/1.8;
	
	/**
	 * Converting a grad to a degree
	 * @const
	 */
	var GRAD_DEG = 0.9;
	
	/**
	 * Converting a grad to a radian
	 * @const
	 */
	var GRAD_RAD = Math.PI/200;
	
	/**
	 * Functions for converting angles
	 * @var Object
	 */
	$.extend({
		angle: {
			/**
			 * available units for an angle
			 * @var Regex
			 */
			runit: /(deg|g?rad)/,
			
			/**
			 * Convert a radian into a degree
			 * @param Number rad
			 * @return Number
			 */
			radianToDegree: function(rad) {
				return rad * RAD_DEG;
			},
			
			/**
			 * Convert a radian into a degree
			 * @param Number rad
			 * @return Number
			 */
			radianToGrad: function(rad) {
				return rad * RAD_GRAD;
			},
			
			/**
			 * Convert a degree into a radian
			 * @param Number deg
			 * @return Number
			 */
			degreeToRadian: function(deg) {
				return deg * DEG_RAD;
			},
			
			/**
			 * Convert a degree into a radian
			 * @param Number deg
			 * @return Number
			 */
			degreeToGrad: function(deg) {
				return deg * DEG_GRAD;
			},
			
			/**
			 * Convert a grad into a degree
			 * @param Number grad
			 * @return Number
			 */
			gradToDegree: function(grad) {
				return grad * GRAD_DEG;
			},
			
			/**
			 * Convert a grad into a radian
			 * @param Number grad
			 * @return Number
			 */
			gradToRadian: function(grad) {
				return grad * GRAD_RAD;
			}
		}
	});
})(jQuery, this, this.document);

///////////////////////////////////////////////////////
// Transform
///////////////////////////////////////////////////////
(function($, window, document, undefined) {
	/**
	 * @var Regex identify the matrix filter in IE
	 */
	var rmatrix = /progid:DXImageTransform\.Microsoft\.Matrix\(.*?\)/;
	
	/**
	 * Class for creating cross-browser transformations
	 * @constructor
	 */
	$.extend({
		transform: function(elem) {
			// Cache the transform object on the element itself
			elem.transform = this;
			
			/**
			 * The element we're working with
			 * @var jQueryCollection
			 */
			this.$elem = $(elem);
			
			/**
			 * Remember the transform property so we don't have to keep
			 * looking it up
			 * @var string
			 */
			this.transformProperty = this.getTransformProperty();
			
			/**
			 * Remember the matrix we're applying to help the safeOuterLength func
			 */
			this.applyingMatrix = false;
			this.matrix = null;
			
			/**
			 * Remember the css height and width to save time
			 * This is only really used in IE
			 * @var Number
			 */
			this.height = null;
			this.width = null;
			this.outerHeight = null;
			this.outerWidth = null;
			
			/**
			 * We need to know the box-sizing in IE for building the outerHeight and outerWidth
			 * @var string
			 */
			this.boxSizingValue = null;
			this.boxSizingProperty = null;
			
			this.attr = null;
		}
	});
	
	$.extend($.transform, {
		/**
		 * @var Array list of all valid transform functions
		 */
		funcs: ['matrix', 'origin', 'reflect', 'reflectX', 'reflectXY', 'reflectY', 'rotate', 'scale', 'scaleX', 'scaleY', 'skew', 'skewX', 'skewY', 'translate', 'translateX', 'translateY'],
		
		rfunc: {
			/**
			 * @var Regex identifies functions that require an angle unit
			 */
			angle: /^rotate|skew[X|Y]?$/,
			
			/**
			 * @var Regex identifies functions that require a length unit
			 */
			length: /^origin|translate[X|Y]?$/,
			
			/**
			 * @var Regex identifies functions that do not require a unit
			 */
			scale: /^scale[X|Y]?$/,
			
			/**
			 * @var Regex reflection functions
			 */
			reflect: /^reflect(XY|X|Y)?$/
		}
	});
	
	/**
	 * Create Transform as a jQuery plugin
	 * @param Object funcs
	 * @param Object options
	 */
	$.fn.transform = function(funcs, options) {
		return this.each(function() {
			var t = this.transform || new $.transform(this);
			if (funcs) {
				t.exec(funcs, options);
			}
		});
	};	
	
	$.transform.prototype = {
		/**
		 * Applies all of the transformations
		 * @param Object funcs
		 * @param Object options
		 * forceMatrix - uses the matrix in all browsers
		 * preserve - tries to preserve the values from previous runs
		 */
		exec: function(funcs, options) {
			// determine if the CSS property is known 
			var property = this.transformProperty;
			
			// extend options
			options = $.extend(true, {
				forceMatrix: false,
				preserve: false
			}, options);
	
			// preserve the funcs from the previous run
			this.attr = null;
			if (options.preserve) {
				funcs = $.extend(true, this.getAttrs(true, true), funcs);
			} else {
				funcs = $.extend(true, {}, funcs); // copy the object to prevent weirdness
			}
			
			// Record the custom attributes on the element itself (helps out
			//	the animator)
			this.setAttrs(funcs);
			
			// apply the funcs
			if (property && !options.forceMatrix) {
				// CSS3 is supported
				return this.execFuncs(funcs);
			} else if ($.browser.msie || (property && options.forceMatrix)) {
				// Internet Explorer or Forced matrix
				return this.execMatrix(funcs);
			}
			return false;
		},
		
		/**
		 * Applies all of the transformations as functions
		 * var Object funcs
		 */
		execFuncs: function(funcs) {
			var values = [];
			var property = this.transformProperty;
			
			// construct a CSS string
			for (var func in funcs) {
				// handle origin separately
				if (func == 'origin') {
					this[func].apply(this, $.isArray(funcs[func]) ? funcs[func] : [funcs[func]]);
				} else if ($.inArray(func, $.transform.funcs) != -1) {
					values.push(this.createTransformFunc(func, funcs[func]));
				}
			}
			this.setCssDebug(property, values.join(' '));
			return true;
		},
		
		/**
		 * Applies all of the transformations as a matrix
		 * var Object options
		 */
		execMatrix: function(funcs) {
			var matrix,
				property = this.transformProperty,
				args;
			
			// collect all the matrices
			var strip = function(i, arg) {
				args[i] = parseFloat(arg);
			};
			
			for (var func in funcs) {
				if ($.matrix[func] || func == 'matrix') {
					args = $.isArray(funcs[func]) ? funcs[func] : [funcs[func]];
					
					// strip the units
					// TODO: should probably convert the units properly instead of just stripping them
					$.each(args, strip);
					
					var m;
					if (func == 'matrix') {
						m = new $.matrix.M2x2(args[0], args[1], args[2], args[3]);
						if (args[4]) {
							this.setAttr('translateX', args[4]);
						}
						if (args[5]) {
							this.setAttr('translateY', args[5]);
						}
					} else {
						m = $.matrix[func].apply(this, args);
					}
					
					if (!matrix) {
						matrix = m;
					} else {
						matrix = matrix.x(m);
					}
				} else if (func == 'origin') {
					args = $.isArray(funcs[func]) ? funcs[func] : [funcs[func]];
					this[func].apply(this, args);
				}
			}
			
			
			// calculate translation
			// NOTE: Translate is additive
			var translate = this.getAttr('translate') || 0,
				translateX = this.getAttr('translateX') || 0,
				translateY = this.getAttr('translateY') || 0;
				
			if (!$.isArray(translate)) {
				translate = [translate, 0];
			}
			
			// check that we have a matrix
			if (!matrix) {
				// TODO: This will result in a filter being needlessly set in IE
				matrix = new $.matrix.M2x2(1, 0, 0, 1);
			}
			
			// pull out the relevant values
			var a = parseFloat(parseFloat(matrix.e(1,1)).toFixed(8)),
				b = parseFloat(parseFloat(matrix.e(2,1)).toFixed(8)),
				c = parseFloat(parseFloat(matrix.e(1,2)).toFixed(8)),
				d = parseFloat(parseFloat(matrix.e(2,2)).toFixed(8)),
				tx = 0,
				ty = 0;
				
			
			// only run the translate matrix if we need to
			if (translate[0] || translate[1] || translateX || translateY) {
				var	tvector = matrix.x(new $.matrix.V2(
					parseFloat(translate[0]) + parseFloat(translateX),
					parseFloat(translate[1]) + parseFloat(translateY)
				));
				tx = parseFloat(parseFloat(tvector.e(1)).toFixed(8));
				ty = parseFloat(parseFloat(tvector.e(2)).toFixed(8));
			}
			
			//apply the transform to the element
			if (property && property.substr(0, 4) == '-moz') { // -moz
				this.setCssDebug(property, 'matrix(' + a + ', ' + b + ', ' + c + ', ' + d + ', ' + tx + 'px, ' + ty + 'px)');
			} else if (property) { // -webkit, -o, w3c
				// NOTE: WebKit and Opera don't allow units on the translate variables
				this.setCssDebug(property, 'matrix(' + a + ', ' + b + ', ' + c + ', ' + d + ', ' + tx + ', ' + ty + ')');
			} else if (jQuery.browser.msie) { // IE
				// IE requires the special transform Filter
				var style = this.$elem[0].style;
				var matrixFilter = 'progid:DXImageTransform.Microsoft.Matrix(M11=' + a + ', M12=' + c + ', M21=' + b + ', M22=' + d + ', sizingMethod=\'auto expand\')';
				var filter = style.filter || jQuery.curCSS( this.$elem[0], "filter" ) || "";
				style.filter = rmatrix.test(filter) ? filter.replace(rmatrix, matrixFilter) : filter ? filter + ' ' + matrixFilter : matrixFilter;
				
				// Let's know that we're applying post matrix fixes and the height/width will be static for a bit
				this.applyingMatrix = true;
				this.matrix = matrix;
				
				// IE can't set the origin or translate directly
				this.fixPosition(matrix, tx, ty);
				
				this.applyingMatrix = false;
				this.matrix = null;
			}
			return true;
		},
		
		setCssDebug: function(prop, val) {
			//console.log(prop,val);
			this.$elem.css(prop,val);
		},
		
		/**
		 * Sets the transform-origin
		 * @param Number x length
		 * @param Number y length
		 */
		origin: function(x, y) {
			var property = this.transformProperty,
				height = this.safeOuterHeight(),
				width = this.safeOuterWidth();
				
			// correct for word lengths
			switch (x) {
				case 'left': x = '0'; break;
				case 'right': x = width; break;
				case 'center': x = width * 0.5; break;
			}
			switch (y) {
				case 'top': y = '0'; break;
				case 'bottom': y = height; break;
				case 'center': // no break
				case undefined: y = height * 0.5; break;
			}
	
			// assume all length units are px
			//TODO: handle unit conversion better
			x = /%/.test(x) ? width * parseFloat(x) /100 : parseFloat(x);
			if (typeof(y) !== 'undefined') {
				y = /%/.test(y) ? height * parseFloat(y) /100 : parseFloat(y);
			}
			
			// Apply the property
			if (property) { //Moz, WebKit, Opera
				if (!y && y !== 0) {
					this.setCssDebug(property + '-origin', x + 'px');
				} else {
					this.setCssDebug(property + '-origin', x + 'px ' + y + 'px');
				}
			}
			
			// remember the transform origin
			// TODO: setting in px isn't an entirely accurate way to do this
			if (!y && y !== 0) {
				this.setAttr('origin', x);
			} else {
				this.setAttr('origin', [x, y]);
			}
			return true;
		},
		
		/**
		 * Try to determine which browser we're in by the existence of a
		 * custom transform property
		 * @param void
		 * @return String
		 */
		getTransformProperty: function() {
			if (this.transformProperty) {
				return this.transformProperty;
			}
			var elem = document.body;
			var property = {
				transform : 'transform',
				MozTransform : '-moz-transform',
				WebkitTransform : '-webkit-transform',
				OTransform : '-o-transform'
			};
			for (var p in property) {
				if (typeof elem.style[p] != 'undefined') {
					 this.transformProperty = property[p];
					return property[p];
				}
			}
			// Default to transform also
			return null;
		},
		
		/**
		 * Create a function suitable for a CSS value
		 * @param string func
		 * @param Mixed value
		 */
		createTransformFunc: function(func, value) {
			if ($.transform.rfunc.reflect.test(func)) {
				// let's fake reflection
				var matrix = value ? $.matrix[func]() : $.matrix.empty(),
					a = matrix.e(1,1),
					b = matrix.e(2,1),
					c = matrix.e(1,2),
					d = matrix.e(2,2);
				return 'matrix(' + a + ', ' + b + ', ' + c + ', ' + d + ', 0, 0)';
			}
			
			value = _correctUnits(func, value);
			
			if  (!$.isArray(value)) {
				return func + '(' + value + ')';
			} else if (func == 'matrix') {
				if($.browser.mozilla) {
					// Janne A, fix for firefox, 26.8.2010
					return 'matrix(' + value[0] + ', ' + value[1] + ', ' + value[2] + ', ' + value[3] + ', ' + (value[4] || 0) + 'px, ' + (value[5] || 0) + 'px)';
				} else {
					return 'matrix(' + value[0] + ', ' + value[1] + ', ' + value[2] + ', ' + value[3] + ', ' + (value[4] || 0) + ', ' + (value[5] || 0) + ')';
				}
			} else {
				return func + '(' + value[0] + ', ' + value[1] + ')';
			}
		},
		
		/**
		 * @param Matrix matrix
		 * @param Number tx
		 * @param Number ty
		 * @param Number height
		 * @param Number width
		 */
		fixPosition: function(matrix, tx, ty, height, width) {
			// now we need to fix it!
			var	calc = new $.matrix.calc(matrix, this.safeOuterHeight(), this.safeOuterWidth()),
				origin = this.getAttr('origin');
				
			// translate a 0, 0 origin to the current origin
			var offset = calc.originOffset({
				x: parseFloat(origin[0]),
				y: parseFloat(origin[1])
			});
			
			// IE glues the top-most and left-most pixels of the transformed object to top/left of the original object
			var sides = calc.sides();

			// Protect against an item that is already positioned
			var cssPosition = this.setCssDebug('position');
			if (cssPosition == 'static') {
				cssPosition = 'relative';
			}
			
			//TODO: if the element is already positioned, we should attempt to respect it (somehow)
			//NOTE: we could preserve our offset top and left in an attr on the elem
			var pos = {top: 0, left: 0};
			
			// Approximates transform-origin, tx, and ty
			var css = {
				'position': cssPosition,
				'top': (offset.top + ty + sides.top + pos.top) + 'px',
				'left': (offset.left + tx + sides.left + pos.left) + 'px',
				'zoom': 1
			};

			this.setCssDebug(css);
		}
	};
	
	/**
	 * Ensure that values have the appropriate units on them
	 * @param string func
	 * @param Mixed value
	 */
	var rfxnum = /^([\+\-]=)?([\d+.\-]+)(.*)$/;
	function _correctUnits(func, value) {
		var result = !$.isArray(value)? [value] : value,
			rangle = $.transform.rfunc.angle,
			rlength = $.transform.rfunc.length;
		
		for (var i = 0, len = result.length; i < len; i++) {
			var parts = rfxnum.exec(result[i]),
				unit = '';
			
			// Use an appropriate unit
			if (rangle.test(func)) {
				unit = 'deg';
				
				// remove nonsense units
				if (parts[3] && !$.angle.runit.test(parts[3])) {
					parts[3] = null;
				}
			} else if (rlength.test(func)) {
				unit = 'px';
			}
			
			// ensure a value and appropriate unit
			if (!parts) {
				result[i] = 0 + unit;
			} else if(!parts[3]) {
				result[i] += unit;
			}
			
		}
		return len == 1 ? result[0] : result;
	}
})(jQuery, this, this.document);


///////////////////////////////////////////////////////
// Safe Outer Length
///////////////////////////////////////////////////////
(function($, window, document, undefined) {
	$.extend($.transform.prototype, {
		/**
		 * @param void
		 * @return Number
		 */
		safeOuterHeight: function() {
			return this.safeOuterLength('height');
		},
		
		/**
		 * @param void
		 * @return Number
		 */
		safeOuterWidth: function() {
			return this.safeOuterLength('width');
		},
		
		/**
		 * Returns reliable outer dimensions for an object that may have been transformed.
		 * Only use this if the matrix isn't handy
		 * @param String dim height or width
		 * @return Number
		 */
		safeOuterLength: function(dim) {
			var funcName = 'outer' + (dim == 'width' ? 'Width' : 'Height');
			
			if ($.browser.msie) {
				// make the variables more generic
				dim = dim == 'width' ? 'width' : 'height';
				
				// if we're transforming and have a matrix; we can shortcut.
				// the true outerHeight is the transformed outerHeight divided by the ratio.
				// the ratio is equal to the height of a 1px by 1px box that has been transformed by the same matrix.
				if (this.applyingMatrix && !this[funcName] && this.matrix) {
					// calculate and return the correct size
					var calc = new $.matrix.calc(this.matrix, 1, 1),
						ratio = calc.size(),
						length = this.$elem[funcName]() / ratio[dim];
					this[funcName] = length;
					
					return length;
				} else if (this.applyingMatrix && this[funcName]) {
					// return the cached calculation
					return this[funcName];
				}
				
				// map dimensions to box sides			
				var side = {
					height: ['top', 'bottom'],
					width: ['left', 'right']
				};
				
				// setup some variables
				var elem = this.$elem[0],
					outerLen = parseFloat($.curCSS(elem, dim, true)), //TODO: this can be cached on animations that do not animate height/width
					boxSizingProp = this.boxSizingProperty,
					boxSizingValue = this.boxSizingValue;
				
				// IE6 && IE7 will never have a box-sizing property, so fake it
				if (!this.boxSizingProperty) {
					boxSizingProp = this.boxSizingProperty = _findBoxSizingProperty() || 'box-sizing';
					boxSizingValue = this.boxSizingValue = this.setCssDebug(boxSizingProp) || 'content-box';
				}
				
				// return it immediately if we already know it
				if (this[funcName] && this[dim] == outerLen) {
					return this[funcName];
				} else {
					this[dim] = outerLen;
				}
				
				// add in the padding and border
				if (boxSizingProp && (boxSizingValue == 'padding-box' || boxSizingValue == 'content-box')) {
					outerLen += parseFloat($.curCSS(elem, 'padding-' + side[dim][0], true)) || 0 +
								  parseFloat($.curCSS(elem, 'padding-' + side[dim][1], true)) || 0;
				}
				if (boxSizingProp && boxSizingValue == 'content-box') {
					outerLen += parseFloat($.curCSS(elem, 'border-' + side[dim][0] + '-width', true)) || 0 +
								  parseFloat($.curCSS(elem, 'border-' + side[dim][1] + '-width', true)) || 0;
				}
				
				// remember and return the outerHeight
				this[funcName] = outerLen;
				return outerLen;
			}
			return this.$elem[funcName]();
		}
	});
	
	/**
	 * Determine the correct property for checking the box-sizing property
	 * @param void
	 * @return string
	 */
	var _boxSizingProperty = null;
	function _findBoxSizingProperty () {
		if (_boxSizingProperty) {
			return _boxSizingProperty;
		} 
		
		var property = {
				boxSizing : 'box-sizing',
				MozBoxSizing : '-moz-box-sizing',
				WebkitBoxSizing : '-webkit-box-sizing',
				OBoxSizing : '-o-box-sizing'
			},
			elem = document.body;
		
		for (var p in property) {
			if (typeof elem.style[p] != 'undefined') {
				_boxSizingProperty = property[p];
				return _boxSizingProperty;
			}
		}
		return null;
	}
})(jQuery, this, this.document);


///////////////////////////////////////////////////////
// Attr
///////////////////////////////////////////////////////
(function($, window, document, undefined) {
	var rfuncvalue = /(origin|matrix|reflect(X|XY|Y)?|rotate|scale[XY]?|skew[XY]?|translate[XY]?)\((.*?)\)/g, // with values
		rfuncname = /^origin|matrix|reflect(XY|[XY])?|rotate|scale[XY]?|skew[XY]?|translate[XY]?$/, // just funcname
		attr = 'data-transform',
		rspace = /\s/,
		rcspace = /,\s/;
	
	$.extend($.transform.prototype, {		
		/**
		 * This overrides all of the attributes
		 * @param Object funcs a list of transform functions to store on this element
		 * @return void
		 */
		setAttrs: function(funcs) {
			var string = '',
				value;
			for (var func in funcs) {
				if (rfuncname.test(func)) {
					value = funcs[func];
					if ($.isArray(value)) {
						value = value.join(', ');
					}
					string += ' ' + func + '(' + value + ')'; 
				}
			}
			this.attr = $.trim(string);
			this.$elem.attr(attr, this.attr);
		},
		
		/**
		 * This sets only a specific atribute
		 * @param string func name of a transform function
		 * @param mixed value with proper units
		 * @return void
		 */
		setAttr: function(func, value) {
			// not a valid function
			if (!rfuncname.test(func)) {
				return;
			}
			
			// stringify the value
			if ($.isArray(value)) {
				value = value.join(', ');
			}
			value = $.trim(value);
			
			var transform = this.attr || this.$elem.attr(attr);
			if (!transform) {
				// We don't have any existing values, save it
				this.attr = value;
				this.$elem.attr(attr, this.attr);
			} else if (transform.indexOf(func) > -1) {
				// we don't have this function yet, save it
				this.attr = transform + ' ' + value;
				this.$elem.attr(attr, this.attr);
			}
			
			// replace the existing value
			var values = [],
				result, parts;
				
			rfuncvalue.exec(''); // hacky, reset the regex pointer
			while ((result = rfuncvalue.exec(transform)) !== null) {
				values.push(result[0]); 
			}
			
			for (var i = 0, l = values.length; i < l; i++) {
				rfuncvalue.exec(''); // hacky, reset the regex pointer
				parts = rfuncvalue.exec(values[i]);
				
				if (func == parts[1]) {
					values[i] = value;
					break;
				}
			}
			this.attr = values.join(' ');
			this.$elem.attr(attr, this.attr);
		},
		
		/**
		 * @return Object values with proper units
		 */
		getAttrs: function() {
			var transform = this.attr || this.$elem.attr(attr);
			if (!transform) {
				// We don't have any existing values, return empty object
				return {};
			}
			
			// replace the existing value
			var values = [],
				attrs = {},
				result, parts, value;
			
			rfuncvalue.exec(''); // hacky, reset the regex pointer
			while ((result = rfuncvalue.exec(transform)) !== null) {
				values.push(result[0]); 
			}
			
			for (var i = 0, l = values.length; i < l; i++) {
				rfuncvalue.exec(''); // hacky, reset the regex pointer
				parts = rfuncvalue.exec(values[i]);
				
				if (parts && rfuncname.test(parts[1])) {
					value = parts[3].split(rcspace);
					attrs[parts[1]] = value.length == 1 ? value[0] : value;
				}
			}
			return attrs;
		},
		
		/**
		 * @param String func 
		 * @param Bool split splits space separated values into an array
		 * @return value with proper units
		 */
		getAttr: function(func) {
			// not a valid function
			if (!rfuncname.test(func)) {
				return null;
			}
			
			var transform = this.attr || this.$elem.attr(attr);
			var rscalefunc = $.transform.rfunc.scale;
			if (func != 'origin' && func != 'matrix' && (!transform || transform.indexOf(func) === -1)) {
				// We don't have any existing values, return null
				return rscalefunc.test(func) ? 1 : null;
			}
			
			// return the existing value
			var values = [],
				result, parts, value = null;
			rfuncvalue.exec(''); // hacky, reset the regex pointer
			while ((result = rfuncvalue.exec(transform)) !== null) {
				values.push(result[0]); 
			}
			
			for (var i = 0, l = values.length; i < l; i++) {
				rfuncvalue.exec(''); // hacky, reset the regex pointer
				parts = rfuncvalue.exec(values[i]);
				
				if (func == parts[1]) {
					value = parts[3].split(rcspace);
					return value.length == 1 ? value[0] : value;
				}
			}
			
			// maybe look it up?
			//NOTE: Moz and WebKit always return the value of transform
			//	as a matrix and obscures the individual functions. So
			//	it's impossible to know what was set in the CSS.
			if (func == 'origin') {
				var rperc = /%/;
				
				// we can look up the origin in CSS
				value = this.transformProperty ?
					this.setCssDebug(this.transformProperty + '-origin') :
					[this.safeOuterWidth() * 0.5, this.safeOuterHeight() * 0.5]; // for IE
				value = $.isArray(value) ? value : value.split(rspace);
				
				//Moz reports the value in % if there hasn't been a transformation yet
				if (rperc.test(value[0])) {
					if (rperc.test(value[0])) {
						value[0] = this.safeOuterWidth() * (parseFloat(value[0])/100);
					}
					if (rperc.test(value[1])) {
						value[1] = this.safeOuterHeight() * (parseFloat(value[1])/100);
					}
				}
			} else if (func == 'matrix') {
				value = [1, 0, 0, 1, 0, 0];
			} else if (rscalefunc.test(func)) {
				// force scale to be 1
				value = 1;
			}
			
			return $.isArray(value) && value.length == 1 ? value[0] : value;
		}
	});
})(jQuery, this, this.document);


///////////////////////////////////////////////////////
// Matrix
///////////////////////////////////////////////////////
(function($, window, document, undefined) {
	/**
	 * Matrix object for creating matrices relevant for 2d Transformations
	 * @var Object
	 */
	$.extend({
		matrix: {}
	});
	
	$.extend( $.matrix, {
		/**
		 * Class for calculating coordinates on a matrix
		 * @param Matrix matrix
		 * @param Number outerHeight
		 * @param Number outerWidth
		 * @constructor
		 */
		calc: function(matrix, outerHeight, outerWidth) {
			/**
			 * @var Matrix
			 */
			this.matrix = matrix;
			
			/**
			 * @var Number
			 */
			this.outerHeight = outerHeight;
			
			/**
			 * @var Number
			 */
			this.outerWidth = outerWidth;
		},
		
		/**
		 * A 2-value vector
		 * @param Number x
		 * @param Number y
		 * @constructor
		 */
		V2: function(x, y){
			this.elements = [x, y];
		},
		
		/**
		 * A 2x2 Matrix, useful for 2D-transformations without translations
		 * @param Number mn
		 * @constructor
		 */
		M2x2: function(m11, m12, m21, m22) {
			this.elements = [m11, m12, m21, m22];
		},
		
		/**
		 * Empty matrix
		 * @return Matrix
		 */
		empty: function() {
			return new $.matrix.M2x2(
				1,  0,
				 0, 1
			);
		},
		
		/**
		 * Reflect (same as rotate(180))
		 * @return Matrix
		 */
		reflect: function() {
			return new $.matrix.M2x2(
				-1,  0,
				 0, -1
			);
		},
		
		/**
		 * Reflect across the x-axis (mirrored upside down)
		 * @return Matrix
		 */
		reflectX: function() {	
			return new $.matrix.M2x2(
				1,  0,
				0, -1
			);
		},
		
		/**
		 * Reflect by swapping x an y (same as reflectX + rotate(-90))
		 * @return Matrix
		 */
		reflectXY: function() {
			return new $.matrix.M2x2(
				0, 1,
				1, 0
			);
		},
		
		/**
		 * Reflect across the y-axis (mirrored)
		 * @return Matrix
		 */
		reflectY: function() {
			return new $.matrix.M2x2(
				-1, 0,
				 0, 1
			);
		},
		
		/**
		 * Rotates around the origin
		 * @param Number deg
		 * @return Matrix
		 */
		rotate: function(deg) {
			//TODO: detect units
			var rad = $.angle.degreeToRadian(deg),
				costheta = Math.cos(rad),
				sintheta = Math.sin(rad);
			
			var a = costheta,
				b = sintheta,
				c = -sintheta,
				d = costheta;
				
			return new $.matrix.M2x2(
				a, c,
				b, d
			);
		
		},
		
		/**
		 * Scale
		 * @param Number sx
		 * @param Number sy
		 * @return Matrix
		 */
		scale: function (sx, sy) {
			sx = sx || sx === 0 ? sx : 1;
			sy = sy || sy === 0 ? sy : sx;
			
			return new $.matrix.M2x2(
				sx, 0,
				0, sy
			);
		},
		
		/**
		 * Scale on the X-axis
		 * @param Number sx
		 * @return Matrix
		 */
		scaleX: function (sx) {
			return $.matrix.scale(sx, 1);
		},
		
		/**
		 * Scale on the Y-axis
		 * @param Number sy
		 * @return Matrix
		 */
		scaleY: function (sy) {
			return $.matrix.scale(1, sy);
		},
		
		/**
		 * Skews on the X-axis and Y-axis
		 * @param Number degX
		 * @param Number degY
		 * @return Matrix
		 */
		skew: function (degX, degY) {
			degX = degX || 0;
			degY = degY || 0;
			
			//TODO: detect units
			var radX = $.angle.degreeToRadian(degX),
				radY = $.angle.degreeToRadian(degY),
				x = Math.tan(radX),
				y = Math.tan(radY);
			
			return new $.matrix.M2x2(
				1, x,
				y, 1
			);
		},
		
		/**
		 * Skews on the X-axis
		 * @param Number degX
		 * @return Matrix
		 */
		skewX: function (degX) {
			return $.matrix.skew(degX);
		},
		
		/**
		 * Skews on the Y-axis
		 * @param Number degY
		 * @return Matrix
		 */
		skewY: function (degY) {
			return $.matrix.skew(0, degY);
		}
	});
	
	$.matrix.calc.prototype = {
		/**
		 * Calculate a coord on the new object
		 * @return Object
		 */
		coord: function(x, y) {
			var matrix = this.matrix,
				vector = matrix.x(new $.matrix.V2(x, y));
				
			return {
				x: vector.e(1),
				y: vector.e(2)
			};
		},
		
		/**
		 * Calculate the corners of the new object
		 * @return Object
		 */
		corners: function() {
			var y = this.outerHeight,
				x = this.outerWidth;
					
			return {
				tl: this.coord(0, 0),
				bl: this.coord(0, y),
				tr: this.coord(x, 0),
				br: this.coord(x, y)
			};
		},
		
		/**
		 * Calculate the dimensions of the new object
		 * @return Object
		 */
		sides: function() {
			// The corners of the box
			var corners = this.corners();
			
			// create empty dimensions
			var sides = {
				top: 0,
				bottom: 0,
				left: 0,
				right: 0
			}, x, y;
			
			// Find the extreme corners
			for (var pos in corners) {
				// Transform the coords
				x = corners[pos].x;
				y = corners[pos].y;
				
				// Record the extreme corners
				if (y < sides.top) {
					sides.top = y;
				}
				if (y > sides.bottom) {
					sides.bottom = y;
				}
				if (x < sides.left) {
					sides.left = x;
				}
				if (x > sides.right) {
					sides.right = x;
				}
			}
			
			return sides;
		},
		
		/**
		 * Calculate the size of the new object
		 * @return Object
		 */
		size: function() {
			var sides = this.sides();
			
			// return size
			return {
				height: Math.abs(sides.bottom - sides.top), 
				width: Math.abs(sides.right - sides.left)
			};
		},
		
		/**
		 * Calculate a proper top and left for IE
		 * @param Object toOrigin
		 * @param Object fromOrigin
		 * @return Object
		 */
		originOffset: function(toOrigin, fromOrigin) {
			// the origin to translate to
			toOrigin = toOrigin ? toOrigin : {
				x: this.outerWidth * 0.5,
				y: this.outerHeight * 0.5
			};
			
			// the origin to translate from (IE has a fixed origin of 0, 0)
			fromOrigin = fromOrigin ? fromOrigin : {
				x: 0,
				y: 0
			};
			
			// transform the origins
			var toCenter = this.coord(toOrigin.x, toOrigin.y);
			var fromCenter = this.coord(fromOrigin.x, fromOrigin.y);
			
			// return the offset
			return {
				top: (fromCenter.y - fromOrigin.y) - (toCenter.y - toOrigin.y),
				left: (fromCenter.x - fromOrigin.x) - (toCenter.x - toOrigin.x)
			};
		}
	};
	
	$.matrix.M2x2.prototype = {
		/**
		 * Multiply a 2x2 matrix by a similar matrix or a vector
		 * @param M2x2 | V2 matrix
		 * @return M2x2 | V2
		 */
		x: function(matrix) {
			var a = this.elements,
				b = matrix.elements;
			
			if (b.length == 2) {
				// b is actually a vector
				return new $.matrix.V2(
					a[0] * b[0] + a[1] * b[1],
					a[2] * b[0] + a[3] * b[1]
				);
			} else if (b.length == 4) {
				// b is a 2x2 matrix
				return new $.matrix.M2x2(
					a[0] * b[0] + a[1] * b[2],
					a[0] * b[1] + a[1] * b[3],
					
					a[2] * b[0] + a[3] * b[2],
					a[2] * b[1] + a[3] * b[3]
				);
			}
			return false; //We don't know how to handle any other types of matrices
		},
		
		/**
		 * Return a specific element from the matrix
		 * @param Number row where 1 is the 0th row
		 * @param Number col where 1 is the 0th column
		 * @return Number
		 */
		e: function(row, col) {
			var i = 0;
			if (row == 1 && col == 2) {
				i = 1;
			} else if (row == 2 && col == 1) {
				i = 2;
			} else if (row == 2 && col == 2) {
				i = 3;
			}
			
			return this.elements[i];
		}
	};
	
	$.matrix.V2.prototype = {		
		/**
		 * Return a specific element from the vector
		 * @param Number i where 1 is the 0th value
		 * @return Number
		 */
		e: function(i) {
			return this.elements[i - 1];
		}
	};
})(jQuery, this, this.document);


///////////////////////////////////////////////////////
// Animation
///////////////////////////////////////////////////////
(function($, window, document, undefined) {
	// Extend the jQuery animation to handle transform functions
	/**
	 * @var Regex looks for units on a string
	 */
	var rfxnum = /^([+\-]=)?([\d+.\-]+)(.*)$/;
	
	/**
	 * @var Regex identify if additional values are hidden in the unit 
	 */
	var rfxmultinum = /^(.*?)\s+([+\-]=)?([\d+.\-]+)(.*)$/;
	
	/**
	 * Doctors prop values in the event that they contain spaces
	 * @param Object prop
	 * @param String speed
	 * @param String easing
	 * @param Function callback
	 * @return bool
	 */
	var _animate = $.fn.animate;
	$.fn.animate = function( prop, speed, easing, callback ) {
		//NOTE: The $.fn.animate() function is a big jerk and requires
		//		you to attempt to convert the values passed into pixels.
		//		So we have to doctor the values passed in here to make
		//		sure $.fn.animate() won't think there's units an ruin
		//		our fun.
		if (prop && !jQuery.isEmptyObject(prop)) {
			var $elem = this;
			jQuery.each( prop, function( name, val ) {
				// Clean up the numbers for space-sperated prop values
				if ($.inArray(name, $.transform.funcs) != -1) {
					// allow for reflection animation
					if ($.transform.rfunc.reflect.test(name)) {
						var m = val ? $.matrix[name]() : $.matrix.empty(), 
							e = m.elements;
						val = [e[0], e[1], e[2], e[3]]; 
					}
				
					var parts = rfxnum.exec(val);
					
					if ((parts && parts[3]) || $.isArray(val)) {
						// Either a unit was found or an array was passed
						var end, unit, values = [];
						
						if ($.isArray(val)) {
							// An array was passed
							$.each(val, function(i) {
								parts = rfxnum.exec(this);
								end = parseFloat(parts[2]);
								unit = parts[3] || "px";
										
								// Remember value
								values.push({
									end: (parts[1] ? parts[1] : '') + end,
									unit: unit
								});
							});
						} else {
							// A unit was found
							end = parseFloat( parts[2] );
							unit = parts[3] || "px";
								
							// Remember the first value
							values.push({
								end: (parts[1] ? parts[1] : '') + end,
								unit: unit
							});
							
							// Detect additional values hidden in the unit
							var i = 0;
							while (parts = rfxmultinum.exec(unit)) {
								// Fix the previous unit
								values[i].unit = parts[1];
								
								// Remember this value
								values.push({
									end: (parts[2] ? parts[2] : '') + parseFloat(parts[3]),
									unit: parts[4]
								});
								unit = parts[4];
								i++;
							}
						}
					
						// Save the values and truncate the value to make it safe to animate
						$elem.data('data-animate-' + name, values);
						prop[name] = values[0].end; // NOTE: this propegates into the arguments object
					}
				}
			});
		}
		//NOTE: we edit prop above
		return _animate.apply(this, arguments);
	};
	
	/**
	 * Returns appropriate start value for transform props
	 * @param Boolean force
	 * @return Number
	 */
	var _cur = $.fx.prototype.cur;
	$.fx.prototype.cur = function(force) {
		//NOTE: The cur function tries to look things up on the element
		//		itself as a native property first instead of as a style
		//		property. However, the animate function is a big jerk
		//		and it's extremely easy to poison the element.style 
		//		with a random property and ruin all of the fun. So, it's
		//		easier to just look it up ourselves.
		if ($.inArray(this.prop, $.transform.funcs) != -1) {
			this.transform = this.transform || this.elem.transform || new $.transform(this.elem);
			var r = $.transform.rfunc;
			
			// return a single unitless number and animation will play nice
			var value = this.transform.getAttr(this.prop),
				parts = rfxnum.exec($.isArray(value) ? value[0] : value);
			if (value === null || parts === null) {
				value = r.scale.test(this.prop) || r.reflect.test(this.prop)  ? 1 : 0;
				parts = [null, null, value];
			}
			return parseFloat(parts[2]);
		}
		return _cur.apply(this, arguments);
	};
	
	/**
	 * Detects the existence of a space separated value
	 * @param Object fx
	 * @return null
	 */
	$.fx.multivalueInit = function(fx) {
		var $elem = $(fx.elem),
			values = fx.transform.getAttr(fx.prop), // existing values
			initValues = $elem.data('data-animate-' + fx.prop); // new values passed into animate
		
		if (initValues) {
			$elem.removeData('data-animate-' + fx.prop); // unremember the saved property
		}
		
		if ($.transform.rfunc.reflect.test(fx.prop)) {
			values = fx.transform.getAttr('matrix');
		}
		
		fx.values = [];
		
		// If we found a previous array but we're only setting one value, we need to set both
		if ($.isArray(values) && !$.isArray(initValues)) {
			initValues = [
				{
					end: parseFloat(fx.end),
					unit: fx.unit
				},
				{
					end: $.transform.rfunc.scale.test(fx.prop) ? 1 : 0,
					unit: fx.unit
				}
			];
		}
		
		// If we altered the values before
		// This happens in the doctored animate function when we pass a unit or multiple values
		if (initValues) {
			var start,
				rscalefunc = $.transform.rfunc.scale,
				parts;
			$.each(initValues, function(i, val) {
				// pull out the start value
				if ($.isArray(values)) {
					start = values[i];
				} else if (i > 0) {
					// scale duplicates the values for x and y
					start = rscalefunc.test(fx.prop) ? values : null;
				} else {
					start = values;
				}
				
				// if we didn't find a start value
				if (!start && start !== 0) {
					start = rscalefunc.test(fx.prop) ? 1 : 0;
				}
				
				// ensure a number
				start = parseFloat(start);
				
				// handle the existence of += and -= prefixes
				parts = rfxnum.exec(val.end);
				if (parts && parts[1]) {
					val.end = ((parts[1] === "-=" ? -1 : 1) * parseFloat(parts[2])) + start;
				}
				
				// Save the values
				fx.values.push({
					start: parseFloat(start),
					end: parseFloat(val.end),
					unit: val.unit
				});
			});
		} else {
			// Save the known value
			fx.values.push({
				start: parseFloat(fx.start),
				end: parseFloat(fx.end), // force a Number
				unit: fx.unit
			});
		}
	};

	/**
	 * Animates a multi value attribute
	 * @param Object fx
	 * @return null
	 */
	$.fx.multivalueStep = {
		_default: function(fx) {
			$.each(fx.values, function(i, val) {
				fx.values[i].now = val.start + ((val.end - val.start) * fx.pos);
			});
		}
	};
	
	/**
	 * Step for animating tranformations
	 */
	$.each($.transform.funcs, function(i, func) {
		$.fx.step[func] = function(fx) {
			// Initialize the transformation
			if (!fx.transformInit) {
				fx.transform = fx.transform || fx.elem.transform || new $.transform(fx.elem);
								
				// Handle multiple values
				$.fx.multivalueInit(fx);
				if (fx.values.length > 1) {
					fx.multiple = true;
				}
				
				// Force degrees for angles, Remove units for unitless
				var r = $.transform.rfunc;
				if (r.angle.test(fx.prop)) {
					//TODO: we should convert from other rational units
					fx.unit = 'deg';
				} else if (r.scale.test(fx.prop)) {
					fx.unit = ''; 
				} else if (r.reflect.test(fx.prop)) {
					//TODO: for animation purposes, this is a matrix and can be animated (although it looks silly)
					fx.unit = ''; //this is a boolean func
				} else if (fx.prop == 'matrix') {
					fx.unit = '';
				}
				//TODO: I guess we already foced length units earlier
				
				// Force all units on multiple values to be the same
				//TODO: we should convert from other rational units
				$.each(fx.values, function(i) {fx.values[i].unit = fx.unit;});
				
				fx.transformInit = true;
			}
			
			
			// Increment all of the values
			if (fx.multiple) {
				($.fx.multivalueStep[fx.prop] || $.fx.multivalueStep._default)(fx);
			} else {
				fx.values[0].now = fx.now;
			}
			
			var values = [];
			
			// Do some value correction and join the values
			$.each(fx.values, function(i, value) {
				// Keep angles below 360 in either direction.
				if (value.unit == 'deg') {
					while (value.now >= 360 ) {
						value.now -= 360;
					}
					while (value.now <= -360 ) {
						value.now += 360;
					}
				}
				// TODO: handle reflection matrices here
				
				//Pretty up the final value (use the double parseFloat
				//	to correct super small decimals)
				values.push(parseFloat(parseFloat(value.now).toFixed(8)) + value.unit);
			});
			
			// Apply the transformation
			var funcs = {},
				prop = $.transform.rfunc.reflect.test(fx.prop) ? 'matrix' : fx.prop;
						
			funcs[prop] = fx.multiple ? values : values[0];
			fx.transform.exec(funcs, {preserve: true});
		};
	});
})(jQuery, this, this.document);