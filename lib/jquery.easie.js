/*
 * Example usage:
 * $(elem).animate( {top: 100}, $.easie(0.25,0.1,0.25,1.0) );
 */
 
/*
 * jquery.easie.js:
 * http://www.github.com/jaukia/easie
 *
 * Version history:
 * 1.0 Initial public version
 *
 * LICENCE INFORMATION:
 *
 * Copyright (c) 2011 Janne Aukia (janne.aukia.com),
 * Louis-Rémi Babé (public@lrbabe.com).
 *
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL Version 2 (GPL-LICENSE.txt) licenses.
 *
 * LICENCE INFORMATION FOR DERIVED FUNCTIONS:
 *
 * Function cubicBezierAtTime is written by Christian Effenberger, 
 * and corresponds 1:1 to the WebKit project function.
 * "WebCore and JavaScriptCore are available under the 
 * Lesser GNU Public License. WebKit is available under 
 * a BSD-style license."
 *
 */

/*jslint sub: true */

(function($) {
    "use strict";

    var prefix = "easie",
        ease = "Ease",
        easeIn = prefix+ease+"In",
        easeOut = prefix+ease+"Out",
        easeInOut = prefix+ease+"InOut",
        names = ["Quad","Cubic","Quart","Quint","Sine","Expo","Circ"];

    $.easie = function(p1x,p1y,p2x,p2y,name,forceUpdate) {
        name = name || [prefix,p1x,p1y,p2x,p2y].join("-");
        if ( !$.easing[name] || forceUpdate ) {
            // around 40x faster with lookup than without it in FF4
            var cubicBezierAtTimeLookup = makeLookup(function(p) {
                // the duration is set to 5.0. this defines the precision of the bezier calculation.
                // the animation is ok for durations up to 5 secs with this.
                // with the lookup table, the precision can be high without any big penalty.
                return cubicBezierAtTime(p,p1x,p1y,p2x,p2y,5.0);
            });
    
            $.easing[name] = function(p, n, firstNum, diff) {
                return cubicBezierAtTimeLookup.call(null, p);
            }
            $.easing[name].params = [p1x,p1y,p2x,p2y];
        }
        return name;
    }

    var $easie = $.easie;

    // default css3 easings

    $easie(0.000, 0.000, 1.000, 1.000, prefix+"Linear");
    $easie(0.250, 0.100, 0.250, 1.000, prefix+ease);
    $easie(0.420, 0.000, 1.000, 1.000, easeIn);
    $easie(0.000, 0.000, 0.580, 1.000, easeOut);
    $easie(0.420, 0.000, 0.580, 1.000, easeInOut);

    // approximated Penner equations, from:
    // http://matthewlein.com/ceaser/
    
    $easie(0.550, 0.085, 0.680, 0.530, easeIn+names[0]);
    $easie(0.550, 0.055, 0.675, 0.190, easeIn+names[1]);
    $easie(0.895, 0.030, 0.685, 0.220, easeIn+names[2]);
    $easie(0.755, 0.050, 0.855, 0.060, easeIn+names[3]);
    $easie(0.470, 0.000, 0.745, 0.715, easeIn+names[4]);
    $easie(0.950, 0.050, 0.795, 0.035, easeIn+names[5]);
    $easie(0.600, 0.040, 0.980, 0.335, easeIn+names[6]);
                    
    $easie(0.250, 0.460, 0.450, 0.940, easeOut+names[0]);
    $easie(0.215, 0.610, 0.355, 1.000, easeOut+names[1]);
    $easie(0.165, 0.840, 0.440, 1.000, easeOut+names[2]);
    $easie(0.230, 1.000, 0.320, 1.000, easeOut+names[3]);
    $easie(0.390, 0.575, 0.565, 1.000, easeOut+names[4]);
    $easie(0.190, 1.000, 0.220, 1.000, easeOut+names[5]);
    $easie(0.075, 0.820, 0.165, 1.000, easeOut+names[6]);
                    
    $easie(0.455, 0.030, 0.515, 0.955, easeInOut+names[0]);
    $easie(0.645, 0.045, 0.355, 1.000, easeInOut+names[1]);
    $easie(0.770, 0.000, 0.175, 1.000, easeInOut+names[2]);
    $easie(0.860, 0.000, 0.070, 1.000, easeInOut+names[3]);
    $easie(0.445, 0.050, 0.550, 0.950, easeInOut+names[4]);
    $easie(1.000, 0.000, 0.000, 1.000, easeInOut+names[5]);
    $easie(0.785, 0.135, 0.150, 0.860, easeInOut+names[6]);

    function makeLookup(func,steps) {
        var i;
        steps = steps || 101;
        var lookupTable = [];
        for(i=0;i<(steps+1);i++) {
            lookupTable[i] = func.call(null,i/steps);
        }
        return function(p) {
            if(p===1) return lookupTable[steps];
            var sp = steps*p;
            // fast flooring, see
            // http://stackoverflow.com/questions/2526682/why-is-javascripts-math-floor-the-slowest-way-to-calculate-floor-in-javascript
            var p0 = Math.floor(sp);
            var y1 = lookupTable[p0];
            var y2 = lookupTable[p0+1];
            return y1+(y2-y1)*(sp-p0);
        }
    }

    // From: http://www.netzgesta.de/dev/cubic-bezier-timing-function.html
    // 1:1 conversion to js from webkit source files
    // UnitBezier.h, WebCore_animation_AnimationBase.cpp
    function cubicBezierAtTime(t,p1x,p1y,p2x,p2y,duration) {
        var ax=0,bx=0,cx=0,ay=0,by=0,cy=0;
        // `ax t^3 + bx t^2 + cx t' expanded using Horner's rule.
        function sampleCurveX(t) {return ((ax*t+bx)*t+cx)*t;}
        function sampleCurveY(t) {return ((ay*t+by)*t+cy)*t;}
        function sampleCurveDerivativeX(t) {return (3.0*ax*t+2.0*bx)*t+cx;}
        // The epsilon value to pass given that the animation is going to run over |dur| seconds. The longer the
        // animation, the more precision is needed in the timing function result to avoid ugly discontinuities.
        function solveEpsilon(duration) {return 1.0/(200.0*duration);}
        function solve(x,epsilon) {return sampleCurveY(solveCurveX(x,epsilon));}
        // Given an x value, find a parametric value it came from.
        function solveCurveX(x,epsilon) {var t0,t1,t2,x2,d2,i;
            function fabs(n) {if(n>=0) {return n;}else {return 0-n;}}
            // First try a few iterations of Newton's method -- normally very fast.
            for(t2=x, i=0; i<8; i++) {x2=sampleCurveX(t2)-x; if(fabs(x2)<epsilon) {return t2;} d2=sampleCurveDerivativeX(t2); if(fabs(d2)<1e-6) {break;} t2=t2-x2/d2;}
            // Fall back to the bisection method for reliability.
            t0=0.0; t1=1.0; t2=x; if(t2<t0) {return t0;} if(t2>t1) {return t1;}
            while(t0<t1) {x2=sampleCurveX(t2); if(fabs(x2-x)<epsilon) {return t2;} if(x>x2) {t0=t2;}else {t1=t2;} t2=(t1-t0)*0.5+t0;}
            return t2; // Failure.
        }
        // Calculate the polynomial coefficients, implicit first and last control points are (0,0) and (1,1).
        cx=3.0*p1x; bx=3.0*(p2x-p1x)-cx; ax=1.0-cx-bx; cy=3.0*p1y; by=3.0*(p2y-p1y)-cy; ay=1.0-cy-by;
        // Convert from input time to parametric value in curve, then from that to output time.
        return solve(t, solveEpsilon(duration));
    }

})(jQuery);