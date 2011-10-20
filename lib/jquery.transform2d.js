/*
 * transform: A jQuery cssHooks adding cross-browser 2d transform capabilities to $.fn.css() and $.fn.animate()
 *
 * limitations:
 * - requires jQuery 1.4.3+
 * - Should you use the *translate* property, then your elements need to be absolutely positionned in a relatively positionned wrapper **or it will fail in IE678**.
 * - transformOrigin is not accessible
 *
 * latest version and complete README available on Github:
 * https://github.com/louisremi/jquery.transform.js
 *
 * Copyright 2011 @louis_remi
 * Licensed under the MIT license.
 *
 * This saved you an hour of work?
 * Send me music http://www.amazon.co.uk/wishlist/HNTU0468LQON
 *
 */
(function( $, window, document, Math ) {
"use strict";

/*
 * Feature tests and global variables
 */
var div = document.createElement("div"),
	divStyle = div.style,
	propertyName = "transform",
	suffix = "Transform",
	testProperties = [
		"O" + suffix,
		"ms" + suffix,
		"Webkit" + suffix,
		"Moz" + suffix
	],
	i = testProperties.length,
	supportProperty,
	supportMatrixFilter,
	supportFloat32Array = "Float32Array" in window,
	propertyHook,
	propertyGet,
	rMatrix = /Matrix([^)]*)/;

// test different vendor prefixes of this property
while ( i-- ) {
	if ( testProperties[i] in divStyle ) {
		$.support[propertyName] = supportProperty = testProperties[i];
		continue;
	}
}
// IE678 alternative
if ( !supportProperty ) {
	$.support.matrixFilter = supportMatrixFilter = divStyle.filter === "";
}

// px isn't the default unit of this property
$.cssNumber[propertyName] = true;

/*
 * fn.css() hooks
 */
if ( supportProperty && supportProperty != propertyName ) {
	// Modern browsers can use jQuery.cssProps as a basic hook
	$.cssProps[propertyName] = supportProperty;
	
	// Firefox needs a complete hook because it stuffs matrix with "px"
	if ( supportProperty == "Moz" + suffix ) {
		propertyHook = {
			get: function( elem, computed ) {
				return (computed ?
					// remove "px" from the computed matrix
					$.css( elem, supportProperty ).split("px").join(""):
					elem.style[supportProperty]
				);
			},
			set: function( elem, value ) {
				// add "px" to matrices
				elem.style[supportProperty] = /matrix\([^)p]*\)/.test(value) ?
					value.replace(/matrix((?:[^,]*,){4})([^,]*),([^)]*)/, "matrix$1$2px,$3px"):
					value;
			}
		};
	/* Fix two jQuery bugs still present in 1.5.1
	 * - rupper is incompatible with IE9, see http://jqbug.com/8346
	 * - jQuery.css is not really jQuery.cssProps aware, see http://jqbug.com/8402
	 */
	} else if ( /^1\.[0-5](?:\.|$)/.test($.fn.jquery) ) {
		propertyHook = {
			get: function( elem, computed ) {
				return (computed ?
					$.css( elem, supportProperty.replace(/^ms/, "Ms") ):
					elem.style[supportProperty]
				);
			}
		};
	}
	/* TODO: leverage hardware acceleration of 3d transform in Webkit only
	else if ( supportProperty == "Webkit" + suffix && support3dTransform ) {
		propertyHook = {
			set: function( elem, value ) {
				elem.style[supportProperty] = 
					value.replace();
			}
		}
	}*/
	
} else if ( supportMatrixFilter ) {
	propertyHook = {
		get: function( elem, computed ) {
			var elemStyle = ( computed && elem.currentStyle ? elem.currentStyle : elem.style ),
				matrix;

			if ( elemStyle && rMatrix.test( elemStyle.filter ) ) {
				matrix = RegExp.$1.split(",");
				matrix = [
					matrix[0].split("=")[1],
					matrix[2].split("=")[1],
					matrix[1].split("=")[1],
					matrix[3].split("=")[1]
				];
			} else {
				matrix = [1,0,0,1];
			}
			matrix[4] = elemStyle ? elemStyle.left : 0;
			matrix[5] = elemStyle ? elemStyle.top : 0;
			return "matrix(" + matrix + ")";
		},
		set: function( elem, value, animate ) {
			var elemStyle = elem.style,
				currentStyle,
				Matrix,
				filter,
				centerOrigin;

			if ( !animate ) {
				elemStyle.zoom = 1;
			}

			value = matrix(value);

			// rotate, scale and skew
			if ( !animate || animate.M ) {
				Matrix = [
					"Matrix("+
						"M11="+value[0],
						"M12="+value[2],
						"M21="+value[1],
						"M22="+value[3],
						"SizingMethod='auto expand'"
				].join();
				filter = ( currentStyle = elem.currentStyle ) && currentStyle.filter || elemStyle.filter || "";

				elemStyle.filter = rMatrix.test(filter) ?
					filter.replace(rMatrix, Matrix) :
					filter + " progid:DXImageTransform.Microsoft." + Matrix + ")";

				// center the transform origin, from pbakaus's Transformie http://github.com/pbakaus/transformie
				if ( (centerOrigin = $.transform.centerOrigin) ) {
					elemStyle[centerOrigin == "margin" ? "marginLeft" : "left"] = -(elem.offsetWidth/2) + (elem.clientWidth/2) + "px";
					elemStyle[centerOrigin == "margin" ? "marginTop" : "top"] = -(elem.offsetHeight/2) + (elem.clientHeight/2) + "px";
				}
			}

			// translate
			if ( !animate || animate.T ) {
				// We assume that the elements are absolute positionned inside a relative positionned wrapper
				elemStyle.left = value[4] + "px";
				elemStyle.top = value[5] + "px";
			}
		}
	};
}
// populate jQuery.cssHooks with the appropriate hook if necessary
if ( propertyHook ) {
	$.cssHooks[propertyName] = propertyHook;
}
// we need a unique setter for the animation logic
propertyGet = propertyHook && propertyHook.get || $.css;

/*
 * fn.animate() hooks
 */
$.fx.step.transform = function( fx ) {
	var elem = fx.elem,
		start = fx.start,
		end = fx.end,
		pos = fx.pos,
		transform,
		translate,
		rotate,
		scale,
		skew,
		T = false,
		M = false,
		prop;
	translate = rotate = scale = skew = "";

	// fx.end and fx.start need to be converted to their translate/rotate/scale/skew components
	// so that we can interpolate them
	if ( !start || typeof start === "string" ) {
		// the following block can be commented out with jQuery 1.5.1+, see #7912
		if ( !start ) {
			start = propertyGet( elem, supportProperty );
		}

		// force layout only once per animation
		if ( supportMatrixFilter ) {
			elem.style.zoom = 1;
		}

		// start is either "none" or a matrix(...) that has to be parsed
		fx.start = start = start == "none"?
			{
				t: [0,0],
				r: 0,
				s: [1,1],
				k: [0,0]
			}:
			unmatrix( toArray(start) );

		// fx.end has to be parsed and decomposed
		fx.end = end = unmatrix(matrix(end));
	}

	/*
	 * We want a fast interpolation algorithm.
	 * This implies avoiding function calls and sacrifying DRY principle:
	 * - avoid $.each(function(){})
	 * - round values using bitewise hacks, see http://jsperf.com/math-round-vs-hack/3
	 */
	if ( start.t[0] || end.t[0] || start.t[1] || end.t[1] ) {
		// round translate to the closest pixel
		translate = " translate("+
			((start.t[0] + (end.t[0] - start.t[0]) * pos + .5) | 0) +"px,"+
			((start.t[1] + (end.t[1] - start.t[1]) * pos + .5) | 0) +"px"+
		")";
		T = true;
	}
	if ( start.r || end.r ) {
		rotate = " rotate("+ (start.r + (end.r - start.r) * pos) +"rad)";
		M = true;
	}
	if ( start.s[0]-1 || end.s[0]-1 || start.s[1]-1 || end.s[1]-1 ) {
		scale = " scale("+
			(start.s[0] + (end.s[0] - start.s[0]) * pos) +","+
			(start.s[1] + (end.s[1] - start.s[1]) * pos) +
		")";
		M = true;
	}
	if ( start.k[0] || end.k[0] || start.k[1] || end.k[1] ) {
		skew = " skew("+
			(start.k[0] + (end.k[0] - start.k[0]) * pos) +"rad,"+
			(start.k[1] + (end.k[1] - start.k[1]) * pos) +"rad"+
		")";
		M = true;
	}

	// The recomposition order is very important
	// see http://hg.mozilla.org/mozilla-central/file/7cb3e9795d04/layout/style/nsStyleAnimation.cpp#l971
	transform = translate + rotate + skew + scale;

	propertyHook && propertyHook.set ?
		propertyHook.set( elem, transform, {M: M, T: T} ):
		elem.style[supportProperty] = transform;
};

/*
 * Utility functions
 */

// turns a transform string into its "matrix(A,B,C,D,X,Y)" form (as an array, though)
function matrix( transform ) {
	transform = transform.split(")");
	var
			trim = $.trim
		, i = -1
		// last element of the array is an empty string, get rid of it
		, l = transform.length -1
		, split, prop, val
		, prev = supportFloat32Array ? new Float32Array(6) : []
		, curr = supportFloat32Array ? new Float32Array(6) : []
		, rslt = supportFloat32Array ? new Float32Array(6) : [1,0,0,1,0,0]
		;

	prev[0] = prev[3] = rslt[0] = rslt[3] = 1;
	prev[1] = prev[2] = prev[4] = prev[5] = 0;

	// Loop through the transform properties, parse and multiply them
	while ( ++i < l ) {
		split = transform[i].split("(");
		prop = trim(split[0]);
		val = split[1];
		curr[0] = curr[3] = 1;
		curr[1] = curr[2] = curr[4] = curr[5] = 0;

		switch (prop) {
			case "translateX":
				curr[4] = parseInt(val, 10);
				break;

			case "translateY":
				curr[5] = parseInt(val, 10);
				break;

			case "translate":
				val = val.split(",");
				curr[4] = parseInt(val[0], 10);
				curr[5] = parseInt(val[1] || 0, 10);
				break;

			case "rotate":
				val = toRadian(val);
				curr[0] = Math.cos(val);
				curr[1] = Math.sin(val);
				curr[2] = -Math.sin(val);
				curr[3] = Math.cos(val);
				break;

			case "scaleX":
				curr[0] = +val;
				break;

			case "scaleY":
				curr[3] = val;
				break;

			case "scale":
				val = val.split(",");
				curr[0] = val[0];
				curr[3] = val.length>1 ? val[1] : val[0];
				break;

			case "skewX":
				curr[2] = Math.tan(toRadian(val));
				break;

			case "skewY":
				curr[1] = Math.tan(toRadian(val));
				break;

			case "skew":
				val = val.split(",");
				curr[2] = Math.tan(toRadian(val[0]));
				curr[1] = Math.tan(toRadian(val[1] || 0));
				break;

			case "matrix":
				val = val.split(",");
				curr[0] = val[0];
				curr[1] = val[1];
				curr[2] = val[2];
				curr[3] = val[3];
				curr[4] = parseInt(val[4], 10);
				curr[5] = parseInt(val[5], 10);
				break;
		}

		// Matrix product
		rslt[0] = prev[0] * curr[0] + prev[1] * curr[2];
		rslt[1] = prev[0] * curr[1] + prev[1] * curr[3];
		rslt[2] = prev[2] * curr[0] + prev[3] * curr[2];
		rslt[3] = prev[2] * curr[1] + prev[3] * curr[3];
		rslt[4] = prev[0] * curr[4] + prev[1] * curr[5] + prev[4];
		rslt[5] = prev[2] * curr[4] + prev[3] * curr[5] + prev[5];

		prev = rslt;
	}
	return rslt;
}

// turns a matrix into its rotate, scale and skew components
// algorithm from http://hg.mozilla.org/mozilla-central/file/7cb3e9795d04/layout/style/nsStyleAnimation.cpp
function unmatrix(matrix) {
	var
			scaleX
		, scaleY
		, skew
		, A = matrix[0]
		, B = matrix[1]
		, C = matrix[2]
		, D = matrix[3]
		;

	// Make sure matrix is not singular
	if ( A * D - B * C ) {
		// step (3)
		scaleX = Math.sqrt( A * A + B * B );
		A /= scaleX;
		B /= scaleX;
		// step (4)
		skew = A * C + B * D;
		C -= A * skew;
		D -= B * skew;
		// step (5)
		scaleY = Math.sqrt( C * C + D * D );
		C /= scaleY;
		D /= scaleY;
		skew /= scaleY;
		// step (6)
		if ( A * D < B * C ) {
			//scaleY = -scaleY;
			//skew = -skew;
			A = -A;
			B = -B;
			skew = -skew;
			scaleX = -scaleX;
		}

	// matrix is singular and cannot be interpolated
	} else {
		throw new Error("matrix is singular");
	}

	return {
		t: [+matrix[4], +matrix[5]],
		r: Math.atan2(B, A),
		s: [scaleX, scaleY],
		k: [Math.atan(skew), 0]
	};
}

// converts an angle string in any unit to a radian Float
function toRadian(value) {
	return ~value.indexOf("deg") ?
		parseInt(value,10) * (Math.PI * 2 / 360):
		~value.indexOf("grad") ?
			parseInt(value,10) * (Math.PI/200):
			parseFloat(value);
}

// Converts "matrix(A,B,C,D,X,Y)" to [A,B,C,D,X,Y]
function toArray(matrix) {
	// Fremove the unit of X and Y for Firefox
	matrix = /\(([^,]*),([^,]*),([^,]*),([^,]*),([^,p]*)(?:px)?,([^)p]*)(?:px)?/.exec(matrix);
	return [matrix[1], matrix[2], matrix[3], matrix[4], matrix[5], matrix[6]];
}

$.transform = {
	centerOrigin: "margin"
};

})( jQuery, window, document, Math );