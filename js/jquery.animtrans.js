/*
 * jquery.positioning.js, part of:
 * http://janne.aukia.com/zoomooz
 *
 * Version history:
 * 0.10 initial stand-alone version
 *
 * LICENCE INFORMATION:
 *
 * Copyright (c) 2010 Janne Aukia (janne.aukia.com)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL Version 2 (GPL-LICENSE.txt) licenses.
 *
 * LICENCE INFORMATION FOR DERIVED FUNCTIONS:
 *
 * Functions CubicBezierAtPosition and  
 * CubicBezierAtTime are written by Christian Effenberger, 
 * and correspond 1:1 to WebKit project functions.
 * "WebCore and JavaScriptCore are available under the 
 * Lesser GNU Public License. WebKit is available under 
 * a BSD-style license."
 *
 */

/*jslint sub: true */

(function($) {
    "use strict";

    //**********************************//
    //***  Variables                 ***//
    //**********************************//
    
    var css_matrix_class;
    
    var animation_start_time;
    var animation_interval_timer;
    
    var regexp_filter_number = /([0-9.\-e]+)/g;
    var regexp_trans_splitter = /([a-z]+)\(([^\)]+)\)/g;
    var regexp_is_deg = /deg$/;

    //**********************************//
    //***  Setup css hook for IE     ***//
    //**********************************//
    
    jQuery.cssHooks["MsTransform"] = {
        set: function( elem, value ) {
            elem.style.msTransform = value;
        }
    };
    
    jQuery.cssHooks["MsTransformOrigin"] = {
        set: function( elem, value ) {
            elem.style.msTransformOrigin = value;
        }
    };

    //**********************************//
    //***  jQuery functions          ***//
    //**********************************//
    
    // element: settings.root
    $.fn.animateTransformation = function(transformation, settings, in_css_matrix_class) {
        css_matrix_class = in_css_matrix_class;
        
        this.each(function() {
            var element = $(this);
            var current_affine = constructAffineFixingRotation(element);
            var final_affine = affineTransformDecompose(transformation);
            final_affine = fixRotationToSameLap(current_affine, final_affine);
            
            if($.browser.webkit && settings.nativeanimation) {
                settings.root.css(constructZoomRootCssTransform(matrixCompose(final_affine), settings.duration, settings.easing));
            } else {
                animateTransition(current_affine, final_affine, settings);
            }
        });
    }
    
    //**********************************//
    //***  Element positioning       ***//
    //**********************************//
    
    function constructZoomRootCssTransform(trans, duration, easing, rootElement) {
        var transdur = roundNumber(duration/1000,6)+"s";
        var transtiming = constructEasingCss(easing);
        
        var propMap = {};
        
        propMap["-ms-transform"] = trans;
        propMap["-webkit-transform"] = trans;
        propMap["-moz-transform"] = trans;
        propMap["-o-transform"] = trans;
        propMap["transform"] = trans;
        
        if(duration) { 
            propMap["-webkit-transition-duration"] = transdur;
            propMap["-o-transition-duration"] = transdur;
        }
        
        if(easing) {
            propMap["-webkit-transition-timing-function"] = transtiming;
            propMap["-o-transition-timing-function"] = transtiming;
        }
        
        return propMap;
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
        
        settings.root.css(constructZoomRootCssTransform(matrixCompose(interpolateArrays(affine_start, affine_end, time_value))));
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
        a = a/sx;
        b = b/sx;
        
        var k = a*c+b*d;
        c -= a*k;
        d -= b*k;
        
        var sy = Math.sqrt(c*c+d*d);
        c = c/sy;
        d = d/sy;
        k = k/sy;
        
        if((a*d-b*c)<0.0) {
            a = -a;
            b = -b;
            c = -c;
            d = -d;
            sx = -sx;
            sy = -sy;
        }
    
        var r = Math.atan2(b,a);
        return {"tx":tx, "ty":ty, "r":r, "k":Math.atan(k), "sx":sx, "sy":sy};
    }
    
    function matrixCompose(ia) {
        var ret = "translate("+roundNumber(ia.tx,6)+"px,"+roundNumber(ia.ty,6)+"px) ";
        ret += "rotate("+roundNumber(ia.r,6)+"rad) skewX("+roundNumber(ia.k,6)+"rad) ";
        ret += "scale("+roundNumber(ia.sx,6)+","+roundNumber(ia.sy,6)+")";
        return ret;
    }
    
    //**********************************//
    //***  Easing functions          ***//
    //**********************************//
    
    function constructEasingCss(input) {
        if((input instanceof Array)) {
            return "cubic-bezier("+roundNumber(input[0],6)+","+roundNumber(input[1],6)+","+
                                   roundNumber(input[2],6)+","+roundNumber(input[3],6)+")";
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
        };
        
        return easingFunc;
    }
    
    // From: http://www.netzgesta.de/dev/cubic-bezier-timing-function.html
    function CubicBezierAtPosition(t,P1x,P1y,P2x,P2y) {
        var x,y,k=((1-t)*(1-t)*(1-t));
        x=P1x*(3*t*t*(1-t))+P2x*(3*t*(1-t)*(1-t))+k;
        y=P1y*(3*t*t*(1-t))+P2y*(3*t*(1-t)*(1-t))+k;
        return {x:Math.abs(x),y:Math.abs(y)};
    }
    
    // From: http://www.netzgesta.de/dev/cubic-bezier-timing-function.html
    // 1:1 conversion to js from webkit source files
    // UnitBezier.h, WebCore_animation_AnimationBase.cpp
    function CubicBezierAtTime(t,p1x,p1y,p2x,p2y,duration) {
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

    //**********************************//
    //***  CSS Matrix helpers        ***//
    //**********************************//

    function fetchElements(m) {
        var mv;
        
        if(m instanceof PureCSSMatrix) {
            mv = m.m.elements;
        } else if(m instanceof Matrix) {
            mv = m.elements;
        }
        
        if(!mv) {
            return {"a":m.a,"b":m.b,"c":m.c,"d":m.d,"e":m.e,"f":m.f};
        }
        
        return {"a":mv[0][0],"b":mv[1][0],"c":mv[0][1],
                "d":mv[1][1],"e":mv[0][2],"f":mv[1][2]};
    }
    
    function constructAffineFixingRotation(elem) {
        var rawTrans = getElementTransform(elem);
        var matr;
        if(!rawTrans) {
            matr = new css_matrix_class();
        } else {
            matr = new css_matrix_class(rawTrans);
        }
        var current_affine = affineTransformDecompose(matr);
        current_affine.r = getTotalRotation(rawTrans);
        return current_affine;
    }
    
    function getTotalRotation(transString) {
        var totalRot = 0;
        var items;
        while((items = regexp_trans_splitter.exec(transString)) !== null) {
            var action = items[1].toLowerCase();
            var val = items[2].split(",");
            if(action=="matrix") {
                var trans = $M([[parseFloat(val[0]),parseFloat(val[2]),parseFloat(filterNumber(val[4]))],
                               [parseFloat(val[1]),parseFloat(val[3]),parseFloat(filterNumber(val[5]))],
                               [                0,                0,                              1]]);
                totalRot += affineTransformDecompose(trans).r;
            } else if(action=="rotate") {
                var raw = val[0];
                var rot = parseFloat(filterNumber(raw));
                if(raw.match(regexp_is_deg)) {
                    rot = (2*Math.PI)*rot/360.0;
                }
                totalRot += rot;
            }
        }
        return totalRot;
    }
    
    // TODO: use modulo instead of loops
    function fixRotationToSameLap(current_affine, final_affine) {
        if(Math.abs(current_affine.r-final_affine.r)>Math.PI) {
            if(final_affine.r<current_affine.r) {
                while(Math.abs(current_affine.r-final_affine.r)>Math.PI) {
                    final_affine.r+=(2*Math.PI);
                }
            } else {
                while(Math.abs(current_affine.r-final_affine.r)>Math.PI) {
                    final_affine.r-=(2*Math.PI);
                }
            }
        }
        return final_affine;
    }
    
    //**********************************//
    //***  Helpers                   ***//
    //**********************************//
    
    function interpolateArrays(st, et, pos) {
        var it = {};
        for(var i in st) {
            if (st.hasOwnProperty(i)) {
                it[i] = st[i]+(et[i]-st[i])*pos;
            }
        }
        return it;
    }
    
    function roundNumber(number, precision) {
        precision = Math.abs(parseInt(precision,10)) || 0;
        var coefficient = Math.pow(10, precision);
        return Math.round(number*coefficient)/coefficient;
    }
    
    function filterNumber(x) {
        return x.match(regexp_filter_number);
    }
    
    function getElementTransform(elem) {
        return ($(elem).css("-webkit-transform") || 
                $(elem).css("-moz-transform") || 
                $(elem).css("-o-transform") || 
                $(elem).css("-ms-transform") || 
                $(elem).css("transform"));
    }
    
})(jQuery);