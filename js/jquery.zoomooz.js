/*!
 * jquery.zoomooz.js, version 0.51
 * http://janne.aukia.com/zoomooz
 *
 * Copyright (c) 2010 Janne Aukia (janne.aukia.com)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL Version 2 (GPL-LICENSE.txt) licenses.
 */

(function($) {
	
	//**********************************//
	//***  Variables                 ***//
	//**********************************//
	
	var animation_start_time;
	var animation_interval_timer;
	var animation_current_affine_transform;
	
	//**********************************//
	//***  jQuery functions          ***//
	//**********************************//
	
	$.fn.debug = function(settings) {
		if($("#debug").length==0) {
			$("body").append('<div id="debug"><div>');
		} else {
			$("#debug").html("");
		}
		settings = jQuery.extend(constructDefaultSettings(), settings);
		this.each(function() {
			showDebug($(this),settings);
		});
	}
	
	$.fn.zoomTo = function(settings) {
		settings = jQuery.extend(constructDefaultSettings(), settings);
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
	
	//**********************************//
	//***  Main zoom function        ***//
	//**********************************//
	
	function zoomTo(elem, settings) {
		var transform = computeTotalTransformation(elem);
		var inverse = (transform) ? transform.inverse(): null;
		var bodytrans = makeViewportTransformation(elem, inverse, settings);
		if($.browser.mozilla || !settings.nativeanimation) {
    	    animateTransition(animation_current_affine_transform, affineTransformDecompose(bodytrans), settings);
	    } else {
	    	animation_current_affine_transform = null;
	        setBodyTransform(matrixToCssTransformation(bodytrans), settings.duration, settings.easing);
	    }
	}
	
	//**********************************//
	//***  Element positioning       ***//
	//**********************************//
	
	function setBodyTransform(trans, duration, easing) {
        var transstr = "-webkit-transform: "+trans+"; transform: "+trans+"; -moz-transform: "+trans+";";
        if(duration) transstr += " -webkit-transition-duration: "+roundNumber(duration/1000,6)+"s;";
        if(easing) transstr += " -webkit-transition-timing-function: "+constructEasingCss(easing)+";";
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
		
		var endpostrans = Matrix.I(3);
		endpostrans.elements[0][2] = xoffset;
		endpostrans.elements[1][2] = yoffset;
		endpostrans.elements[0][0] = scale;
		endpostrans.elements[1][1] = scale;
		if(!endtrans) endtrans = Matrix.I(3);
		totalendtrans = endpostrans.multiply(endtrans);
		
		return totalendtrans;
	}
	
	//**********************************//
	//***  Debugging positioning     ***//
	//**********************************//
	
	function showDebug(elem, settings) {
		var transform = computeTotalTransformation(elem);
		displayLabel(transform.multiply(Vector.create([0,0,1])));
		displayLabel(transform.multiply(Vector.create([0,elem.outerHeight(),1])));
		displayLabel(transform.multiply(Vector.create([elem.outerWidth(),elem.outerHeight(),1])));
		displayLabel(transform.multiply(Vector.create([elem.outerWidth(),0,1])));
	}
	
	function displayLabel(pos) {
		var x = pos.elements[0];
		var y = pos.elements[1];
		$("#debug").append('<div class="debuglabel" style="left:'+x+'px;top:'+y+'px;">&nbsp;</div>');
	}
	
	//**********************************//
	//***  Non-native animation      ***//
	//**********************************//
	
	function animateTransition(st, et, settings) {
	   	if(!st) st = affineTransformDecompose(Matrix.I(3));
		animation_start_time = (new Date()).getTime();
		if(animation_interval_timer) {
			clearInterval(animation_interval_timer);
			animation_interval_timer = null;
		}
		if(settings.easing) settings.easingfunction = constructEasingFunction(settings.easing, settings.duration);
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
		
		/* [ a c e ]
		   [ b d f ]
		   [ 0 0 1 ] */
		
		m = matrix.elements;
		var a = m[0][0], b = m[1][0], c = m[0][1];
		var d = m[1][1], e = m[0][2], f = m[1][2];
	
		if(Math.abs(a*d-b*c)<0.01) {
			console.log("fail!");
			return;
		}
		
		var tx = e;
		var ty = f;
		
		var sx = Math.sqrt(a*a+b*b);
		var a = a/sx;
		var b = b/sx;
		
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
		
		var totalTransformation = Matrix.I(3);
		
		if ( elem === elem.ownerDocument.body ) {
			var bOffset = jQuery.offset.bodyOffset( elem );
			trans = Matrix.I(3);
			trans.elements[0][2] += bOffset.left;
			trans.elements[1][2] += bOffset.top;
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
		var transformation = constructTransformation(elem,left,top);
		totalTransformation = transformation.multiply(totalTransformation);
		
		// loop from node down to root
		while ( (elem = elem.parentNode) && elem !== body && elem !== docElem ) {
			top = 0;
			left = 0;
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
			var transformation = constructTransformation(elem,left,top);
			totalTransformation = transformation.multiply(totalTransformation);
		}
		
		top = 0;
		left = 0;
		if ( prevComputedStyle.position === "relative" || prevComputedStyle.position === "static" ) {
			top  += body.offsetTop;
			left += body.offsetLeft;
		}
		if ( jQuery.offset.supportsFixedPosition && prevComputedStyle.position === "fixed" ) {
			top  += Math.max( docElem.scrollTop, body.scrollTop );
			left += Math.max( docElem.scrollLeft, body.scrollLeft );
		}
		var trans = Matrix.I(3);
		trans.elements[0][2] += left;
		trans.elements[1][2] += top;
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
	//***  Helpers                   ***//
	//**********************************//
	
	function interpolateArrays(st, et, pos) {
		it = {};
		for(var i in st) {
			it[i] = st[i]+(et[i]-st[i])*pos;
		}
		return it;
	}
	
	function cssToMatrixTransformation(inittransform) {
		if(inittransform!="none" && inittransform!="") {
			var mv = inittransform.match(/[^()]+/g)[1].split(",");
			var matrix = $M([[parseFloat(mv[0]),parseFloat(mv[2]),parseFloat(filterNumber(mv[4]))],
							 [parseFloat(mv[1]),parseFloat(mv[3]),parseFloat(filterNumber(mv[5]))],
							 [                0,                0,                              1]])
			return matrix;	
		} else {
			return Matrix.I(3);
		}
	}
	
	function matrixToCssTransformation(mtrx) {
		if(mtrx==null) return null;
		var im = mtrx.elements;
		var vars = [im[0][0],im[1][0],im[0][1],im[1][1],im[0][2],im[1][2]];
		for(var i=0; i<6; i++) {
			vars[i] = roundNumber(vars[i], 6);
		}
		if($.browser.mozilla) {
			vars[4] += "px";
			vars[5] += "px";
		}
		return "matrix("+vars.join(", ")+")";
	}
	
	function constructTransformation(elem,left,top) {
		if(!left) left=0;
		if(!top) top=0;
		var rawTrans = ($(elem).css("-webkit-transform") || $(elem).css("-moz-transform") || $(elem).css("transform"));
		var trans = cssToMatrixTransformation(rawTrans);
		trans.elements[0][2] += left;
		trans.elements[1][2] += top;
		return trans;
	}
	
	function roundNumber(number, precision) {
		precision = Math.abs(parseInt(precision)) || 0;
		var coefficient = Math.pow(10, precision);
		return Math.round(number*coefficient)/coefficient;
	}
	
	function filterNumber(x) {
		return x.match(/([0-9.\-e]+)/g);
	}

})(jQuery);