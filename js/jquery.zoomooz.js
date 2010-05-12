/*!
 * jquery.zoomooz.js, version 0.51
 * http://janne.aukia.com/zoomooz
 *
 * LICENCE INFORMATION:
 *
 * Copyright (c) 2010 Janne Aukia (janne.aukia.com)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL Version 2 (GPL-LICENSE.txt) licenses.
 *
 * LICENCE INFORMATION FOR DERIVED FUNCTIONS:
 *
 * Function computeTotalTransformation based
 * on jquery.fn.offset, copyright John Resig, 2010
 * (MIT and GPL Version 2).
 *
 * Functions CubicBezierAtPosition and  
 * CubicBezierAtTime are written by Christian Effenberger, 
 * and correspond 1:1 to WebKit project functions.
 * "WebCore and JavaScriptCore are available under the 
 * Lesser GNU Public License. WebKit is available under 
 * a BSD-style license."
 */

(function($) {
	
	//**********************************//
	//***  Variables                 ***//
	//**********************************//
	
	var animation_start_time;
	var animation_interval_timer;
	var animation_current_affine_transform;
	
	var css_matrix_class;
	
	//**********************************//
	//***  jQuery functions          ***//
	//**********************************//
	
	$.fn.debug = function(settings) {
		// FIXME hack! css matrix not transform specific
	    settings = jQuery.extend(constructDefaultSettings(), settings);
		css_matrix_class = setupMatrixClass(settings);
		if($("#debug").length==0) {
			$("body").append('<div id="debug"><div>');
		} else {
			$("#debug").html("");
		}
		this.each(function() {
			showDebug($(this),settings);
		});
	}
	
	$.fn.zoomTo = function(settings) {
		// FIXME hack! css matrix not transform specific
		settings = jQuery.extend(constructDefaultSettings(), settings);
		css_matrix_class = setupMatrixClass(settings);
		this.each(function() {
			zoomTo($(this), settings);
		});
		return this;
	}
	
	function constructDefaultSettings() {
		return {
			targetsize: 0.9,
			scalemode: "both",
			duration: 1000,
			easing: "ease",
			root: $(document),
			nativeanimation: true
		};
	}
	
	function setupMatrixClass(settings) {
		if(!settings.nativeanimation && window.WebKitCSSMatrix) {
			return WebKitCSSMatrix;
		} else {
			return PureCSSMatrix;
		}
	}
	
	//**********************************//
	//***  Main zoom function        ***//
	//**********************************//
	
	function zoomTo(elem, settings) {
		var transform = computeTotalTransformation(elem);
		var inverse = (transform) ? transform.inverse(): null;
		var bodytrans = makeViewportTransformation(elem, inverse, settings);
		if($.browser.mozilla || $.browser.opera || !settings.nativeanimation) {
			var final_affine = affineTransformDecompose(bodytrans);
		    animateTransition(animation_current_affine_transform, final_affine, settings);
	    } else {
	    	animation_current_affine_transform = null;
	        setBodyTransform(bodytrans.toString(), settings.duration, settings.easing);
	    }
	}
	
	//**********************************//
	//***  Element positioning       ***//
	//**********************************//
	
	function setBodyTransform(trans, duration, easing) {
		var transdur = roundNumber(duration/1000,6)+"s";
		var transtiming = constructEasingCss(easing);
		
        var transstr = "-webkit-transform: "+trans+"; transform: "+trans+"; -moz-transform: "+trans+";"+" -o-transform: "+trans+";";
        if(duration) transstr += " -webkit-transition-duration: "+transdur+";"+" -o-transition-duration: "+transdur+";";
        if(easing) transstr += " -webkit-transition-timing-function: "+transtiming+";"+" -o-transition-timing-function: "+transtiming+";";
		$(document.body).attr("style", transstr);
	}
	
	function makeViewportTransformation(elem, endtrans, settings) {
		var zoomAmount = settings.targetsize;
		var zoomMode = settings.scalemode;
		var zoomRoot = settings.root;
		
		var dw, dh;
		if(zoomRoot[0]==document) {
			dw = document.documentElement.clientWidth;
			dh = document.documentElement.clientHeight;
		} else {
			dw = zoomRoot.clientWidth;
			dh = zoomRoot.clientHeight;
		}
		
		var relw = dw/elem.outerWidth();
		var relh = dh/elem.outerHeight();
		
		var scale;
		if(zoomMode=="width") {
			scale = zoomAmount*relw;
		} else if(zoomMode=="height") {
			scale = zoomAmount*relh;
		} else if(zoomMode=="both") {
			scale = zoomAmount*Math.min(relw,relh);
		} else {
			console.log("wrong zoommode");
			return;
		}
		
		var xoffset = (dw-elem.outerWidth()*scale)/2.0;
		var yoffset = (dh-elem.outerHeight()*scale)/2.0;
		
		var endpostrans = new css_matrix_class();
		endpostrans = endpostrans.translate(xoffset,yoffset);
		endpostrans = endpostrans.scale(scale,scale);
		if(endtrans) endpostrans = endpostrans.multiply(endtrans);
		return endpostrans;
	}
	
	//**********************************//
	//***  Debugging positioning     ***//
	//**********************************//
	
	function calcPoint(e,x,y) {
	    return [e.a*x+e.c*y+e.e,e.b*x+e.d*y+e.f];
	}
	
	function showDebug(elem, settings) {
		var transform = computeTotalTransformation(elem);
		var e = fetchElements(transform);
		displayLabel(calcPoint(e,0,0));
		displayLabel(calcPoint(e,0,elem.outerHeight()));
		displayLabel(calcPoint(e,elem.outerWidth(),elem.outerHeight()));
		displayLabel(calcPoint(e,elem.outerWidth(),0));
	}
	
	function displayLabel(pos) {
		var label = '<div class="debuglabel" style="left:'+pos[0]+'px;top:'+pos[1]+'px;"></div>'
		$("#debug").append(label);
	}
	
	//**********************************//
	//***  Non-native animation      ***//
	//**********************************//
	
	function animateTransition(st, et, settings) {
	   	if(!st) {
	   		st = affineTransformDecompose(new css_matrix_class());
		}
		animation_start_time = (new Date()).getTime();
		if(animation_interval_timer) {
			clearInterval(animation_interval_timer);
			animation_interval_timer = null;
		}
		if(settings.easing) {
			settings.easingfunction = constructEasingFunction(settings.easing, settings.duration);
		}
		animation_interval_timer = setInterval(function() { animationStep(st, et, settings); }, 1);	
	}
	
	function animationStep(affine_start, affine_end, settings) {
		var current_time = (new Date()).getTime() - animation_start_time;
		var time_value;
		if(settings.easingfunction) {
			time_value = settings.easingfunction(current_time/settings.duration);
		} else {
			time_value = current_time/settings.duration;
		}
		
		if(current_time>settings.duration) {
			clearInterval(animation_interval_timer);
			animation_interval_timer = null;
			time_value=1.0;
		}
		
		var ia = interpolateArrays(affine_start, affine_end, time_value);
		var trans = matrixCompose(ia);
	    setBodyTransform(trans);
		animation_current_affine_transform = ia;
	}
	
	/* Based on pseudo-code in:
	 * https://bugzilla.mozilla.org/show_bug.cgi?id=531344
	 */
	function affineTransformDecompose(matrix) {
		var m = fetchElements(matrix);
		var a=m.a, b=m.b, c=m.c, d=m.d, e=m.e, f=m.f;
	
		if(Math.abs(a*d-b*c)<0.01) {
			console.log("fail!");
			return;
		}
		
		var tx = e, ty = f;
		
		var sx = Math.sqrt(a*a+b*b);
		var a = a/sx, b = b/sx;
		
		var k = a*c+b*d;
		c -= a*k;
		d -= b*k;
		
		var sy = Math.sqrt(c*c+d*d);
		var c = c/sy;
		var d = d/sy;
		var k = k/sy;
		
		if(a*d-b*c<0.0) {
			var a = -a;
			var b = -b;
			var c = -c;
			var d = -d;
			var sx = -sx;
			var sy = -sy;
		}
	
		var r = Math.atan2(b,a);
	
		return {"tx":tx, "ty":ty, "r":r, "k":Math.atan(k), "sx":sx, "sy":sy};
	}
	
	function matrixCompose(ia) {
		var ret = "translate("+roundNumber(ia["tx"],6)+"px,"+roundNumber(ia["ty"],6)+"px) ";
		ret += "rotate("+roundNumber(ia["r"],6)+"rad) skewX("+roundNumber(ia["k"],6)+"rad) ";
		ret += "scale("+roundNumber(ia["sx"],6)+","+roundNumber(ia["sy"],6)+")";
		return ret;
	}
	
	//**********************************//
	//***  Calculating element       ***//
	//***  total transformation      ***//
	//**********************************//
	
	/* Based on:
	 * jQuery.fn.offset
	 */
	function computeTotalTransformation(input) {
		var elem = input[0];
		if( !elem || !elem.ownerDocument ) return null;
		
		var totalTransformation = new css_matrix_class();
		
		if ( elem === elem.ownerDocument.body ) {
			var bOffset = jQuery.offset.bodyOffset( elem );
			trans = new css_matrix_class();
			trans = trans.translate(bOffset.left, bOffset.top);
			totalTransformation = totalTransformation.multiply(trans);
			return totalTransformation;
		}
		
		jQuery.offset.initialize();
	
		var offsetParent = elem.offsetParent;
		var doc = elem.ownerDocument;
		var computedStyle;
		var docElem = doc.documentElement;
		var body = doc.body;
		var defaultView = doc.defaultView;
		if(defaultView) {
			var prevComputedStyle = defaultView.getComputedStyle( elem, null );
		} else {
			var prevComputedStyle = elem.currentStyle;
		}
		
		var top = elem.offsetTop;
		var left = elem.offsetLeft;
		var transformation = constructTransformation().translate(left,top);
		transformation = transformation.multiply(constructTransformation(elem));
		totalTransformation = transformation.multiply((totalTransformation));
		
		// loop from node down to root
		while ( (elem = elem.parentNode) && elem !== body && elem !== docElem ) {
			top = 0; left = 0;
			if ( jQuery.offset.supportsFixedPosition && prevComputedStyle.position === "fixed" ) {
				break;
			}
			computedStyle = defaultView ? defaultView.getComputedStyle(elem, null) : elem.currentStyle;
			top  -= elem.scrollTop;
			left -= elem.scrollLeft;
			if ( elem === offsetParent ) {
				top  += elem.offsetTop;
				left += elem.offsetLeft;
				if ( jQuery.offset.doesNotAddBorder && !(jQuery.offset.doesAddBorderForTableAndCells && /^t(able|d|h)$/i.test(elem.nodeName)) ) {
					top  += parseFloat( computedStyle.borderTopWidth  ) || 0;
					left += parseFloat( computedStyle.borderLeftWidth ) || 0;
				}
				offsetParent = elem.offsetParent;
			}
			if ( jQuery.offset.subtractsBorderForOverflowNotVisible && computedStyle.overflow !== "visible" ) {
				top  += parseFloat( computedStyle.borderTopWidth  ) || 0;
				left += parseFloat( computedStyle.borderLeftWidth ) || 0;
			}
			prevComputedStyle = computedStyle;
			
			var transformation = constructTransformation().translate(left,top);
		    transformation = transformation.multiply(constructTransformation(elem));
		    totalTransformation = transformation.multiply(totalTransformation);
		
		}
		
		top = 0; left = 0;
		if ( prevComputedStyle.position === "relative" || prevComputedStyle.position === "static" ) {
			top  += body.offsetTop;
			left += body.offsetLeft;
		}
		if ( jQuery.offset.supportsFixedPosition && prevComputedStyle.position === "fixed" ) {
			top  += Math.max( docElem.scrollTop, body.scrollTop );
			left += Math.max( docElem.scrollLeft, body.scrollLeft );
		}
		
		var trans = new css_matrix_class().translate(left,top);
		totalTransformation = totalTransformation.multiply(trans);
		
		return totalTransformation;
		
	}
	
	//**********************************//
	//***  Easing functions          ***//
	//**********************************//
	
	function constructEasingCss(input) {
		if((input instanceof Array)) {
			return "cubic-bezier("+roundNumber(input[0],6),roundNumber(input[1],6),
								   roundNumber(input[2],6),roundNumber(input[3],6)+")"
		} else {
			return input;
		}
	}
	
	function constructEasingFunction(input, dur) {
		var params = [];
		if((input instanceof Array)) {
			params = input;
		} else {
			switch(input) {
				case "linear": params = [0.0,0.0,1.0,1.0]; break;
				case "ease": params = [0.25,0.1,0.25,1.0]; break;
				case "ease-in": params = [0.42,0.0,1.0,1.0]; break;
				case "ease-out": params = [0.0,0.0,0.58,1.0]; break;
				case "ease-in-out": params = [0.42,0.0,0.58,1.0]; break;
			}
		}
		
		var easingFunc = function(t) {
			return CubicBezierAtTime(t, params[0], params[1], params[2], params[3], dur);
		}
		
		return easingFunc;
	}
	
	// From: http://www.netzgesta.de/dev/cubic-bezier-timing-function.html
	function CubicBezierAtPosition(t,P1x,P1y,P2x,P2y) {
		var x,y,k=((1-t)*(1-t)*(1-t));
		x=P1x*(3*t*t*(1-t))+P2x*(3*t*(1-t)*(1-t))+k;
		y=P1y*(3*t*t*(1-t))+P2y*(3*t*(1-t)*(1-t))+k;
		return {x:Math.abs(x),y:Math.abs(y)};
	};
	
	// From: http://www.netzgesta.de/dev/cubic-bezier-timing-function.html
	// 1:1 conversion to js from webkit source files
	// UnitBezier.h, WebCore_animation_AnimationBase.cpp
	function CubicBezierAtTime(t,p1x,p1y,p2x,p2y,duration) {
		var ax=0,bx=0,cx=0,ay=0,by=0,cy=0;
		// `ax t^3 + bx t^2 + cx t' expanded using Horner's rule.
        function sampleCurveX(t) {return ((ax*t+bx)*t+cx)*t;};
        function sampleCurveY(t) {return ((ay*t+by)*t+cy)*t;};
        function sampleCurveDerivativeX(t) {return (3.0*ax*t+2.0*bx)*t+cx;};
		// The epsilon value to pass given that the animation is going to run over |dur| seconds. The longer the
		// animation, the more precision is needed in the timing function result to avoid ugly discontinuities.
		function solveEpsilon(duration) {return 1.0/(200.0*duration);};
        function solve(x,epsilon) {return sampleCurveY(solveCurveX(x,epsilon));};
		// Given an x value, find a parametric value it came from.
        function solveCurveX(x,epsilon) {var t0,t1,t2,x2,d2,i;
			function fabs(n) {if(n>=0) {return n;}else {return 0-n;}}; 
            // First try a few iterations of Newton's method -- normally very fast.
            for(t2=x, i=0; i<8; i++) {x2=sampleCurveX(t2)-x; if(fabs(x2)<epsilon) {return t2;} d2=sampleCurveDerivativeX(t2); if(fabs(d2)<1e-6) {break;} t2=t2-x2/d2;}
            // Fall back to the bisection method for reliability.
            t0=0.0; t1=1.0; t2=x; if(t2<t0) {return t0;} if(t2>t1) {return t1;}
            while(t0<t1) {x2=sampleCurveX(t2); if(fabs(x2-x)<epsilon) {return t2;} if(x>x2) {t0=t2;}else {t1=t2;} t2=(t1-t0)*.5+t0;}
            return t2; // Failure.
        };
		// Calculate the polynomial coefficients, implicit first and last control points are (0,0) and (1,1).
		cx=3.0*p1x; bx=3.0*(p2x-p1x)-cx; ax=1.0-cx-bx; cy=3.0*p1y; by=3.0*(p2y-p1y)-cy; ay=1.0-cy-by;
		// Convert from input time to parametric value in curve, then from that to output time.
    	return solve(t, solveEpsilon(duration));
	};

	//**********************************//
	//***  WebKitCSSMatrix in        ***//
	//***  pure Javascript           ***//
	//**********************************//
	
	function fetchElements(m) {
		if(m instanceof PureCSSMatrix) {
			var mv = m.m.elements;
			return {"a":mv[0][0],"b":mv[1][0],"c":mv[0][1],
					"d":mv[1][1],"e":mv[0][2],"f":mv[1][2]};
		} else {
			return {"a":m.a,"b":m.b,"c":m.c,"d":m.d,"e":m.e,"f":m.f};
		}
	}
	
	function constructTransformation(elem) {
		var rawTrans = ($(elem).css("-webkit-transform") || $(elem).css("-moz-transform") || $(elem).css("-o-transform") || $(elem).css("transform"));
		if(!rawTrans) {
			return new css_matrix_class()
		} else {
			return new css_matrix_class(rawTrans);
		}
	}
	
	function PureCSSMatrix(trans) {
		if(trans && trans!=null && trans!="none") {
			if(trans instanceof Matrix) {
				this.setMatrix(trans);
			} else {
				this.setMatrixValue(trans);
			}
		} else {
			this.m = Matrix.I(3);
		}
	}
	
	PureCSSMatrix.prototype.setMatrix = function(matr) {
		this.m = matr;
	}
	
	PureCSSMatrix.prototype.setMatrixValue = function(transString) {
		var mtr = Matrix.I(3);
		
		var transSplitter = /([a-z]+)\(([^\)]+)\)/g;
		var isDeg = /deg$/;
		
		var items;
		while((items = transSplitter.exec(transString)) != null) {
			var action = items[1].toLowerCase();
			var val = items[2].split(",");
			if(action=="matrix") {
				var trans = $M([[parseFloat(val[0]),parseFloat(val[2]),parseFloat(filterNumber(val[4]))],
							   [parseFloat(val[1]),parseFloat(val[3]),parseFloat(filterNumber(val[5]))],
							   [                0,                0,                              1]])
			} else if(action=="translate") {
				var trans = Matrix.I(3);
				trans.elements[0][2] = parseFloat(filterNumber(val[0]));
				trans.elements[1][2] = parseFloat(filterNumber(val[1]));
			} else if(action=="scale") {
				var sx = parseFloat(val[0]);
				if(val.length>1) {
					var sy = parseFloat(val[1]);
				} else {
					var sy = sx;
				}
				var trans = $M([[sx, 0, 0], [0, sy, 0], [0, 0, 1]]);
			} else if(action=="rotate") {
				var raw = val[0];
				var rot = parseFloat(filterNumber(raw));
				if(raw.match(isDeg)) {
					rot = (2*Math.PI)*rot/360.0;
				}
				var trans = Matrix.RotationZ(rot);
			} else {
				console.log("Problem with setMatrixValue", action, values);
			}
			
			mtr = mtr.multiply(trans);
		}
		
		this.m = mtr;
	};
	
	PureCSSMatrix.prototype.multiply = function(m2) {
		return new PureCSSMatrix(this.m.multiply(m2.m));
	};
	
	PureCSSMatrix.prototype.inverse = function() {
		return new PureCSSMatrix(this.m.inverse());
	};
	
	PureCSSMatrix.prototype.translate = function(x,y) {
		var trans = Matrix.I(3);
		trans.elements[0][2] = x;
		trans.elements[1][2] = y;
		return new PureCSSMatrix(this.m.multiply(trans));
	};
	
	PureCSSMatrix.prototype.scale = function(sx,sy) {
		var trans = $M([[sx, 0, 0], [0, sy, 0], [0, 0, 1]]);
		return new PureCSSMatrix(this.m.multiply(trans));	
	};
	
	PureCSSMatrix.prototype.rotate = function(rot) {
		var trans = Matrix.RotationZ(rot);
		return new PureCSSMatrix(this.m.multiply(trans));
	};
	
	PureCSSMatrix.prototype.toString = function() {
		var e = this.m.elements;
		var pxstr = "";
		if($.browser.mozilla || $.browser.opera) pxstr = "px";
		return "matrix("+printFixedNumber(e[0][0])+", "+printFixedNumber(e[1][0])+", "+
						 printFixedNumber(e[0][1])+", "+printFixedNumber(e[1][1])+", "+
						 printFixedNumber(e[0][2])+pxstr+", "+printFixedNumber(e[1][2])+pxstr+")";
	};
	
	//**********************************//
	//***  Helpers                   ***//
	//**********************************//
	
	function interpolateArrays(st, et, pos) {
		it = {};
		for(var i in st) {
			it[i] = st[i]+(et[i]-st[i])*pos;
		}
		return it;
	}
	
	function roundNumber(number, precision) {
		precision = Math.abs(parseInt(precision)) || 0;
		var coefficient = Math.pow(10, precision);
		return Math.round(number*coefficient)/coefficient;
	}
	
	function filterNumber(x) {
		return x.match(/([0-9.\-e]+)/g);
	}
	
	function printFixedNumber(x) {
		return Number(x).toFixed(6);
	}
	
})(jQuery);