/*
 * jquery.zoomooz-core.js, part of:
 * http://janne.aukia.com/zoomooz
 *
 * Version history:
 * 1.02 bug fix on endcallback resetting for native animation
 * 1.01 declarative syntax and fixes
 * 0.92 working scrolling
 * 0.91 simplifying code base and scrolling for non-body zoom roots
 * 0.90 fixing margin on first body child
 * 0.89 support for jquery 1.7
 * 0.88 fixed a bug with 90 deg rotations
 * 0.87 fixed a bug with settings and a couple of demos
 * 0.86 fixed a bug with non-body zoom root
 * 0.85 basic IE9 support
 * 0.81 basic support for scrolling
 * 0.80 refactored position code to a separate file
 * 0.72 fixed a bug with skew in Webkit
 * 0.71 fixed bugs with FF4
 * 0.70 support for non-body zoom root
 * 0.69 better settings management
 * 0.68 root element tuning
 * 0.67 adjustable zoom origin (not fully working yet)
 * 0.65 zoom origin to center
 * 0.63 basic Opera support
 * 0.61 refactored to use CSSMatrix classes
 * 0.51 initial public version
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
 */

/*jslint sub: true */

(function($) {
    "use strict";

    //**********************************//
    //***  Variables                 ***//
    //**********************************//
    
    var helpers = $.zoomooz.helpers;
    
    var animationSettings = ["duration", "easing", "nativeanimation"];
    
    //**********************************//
    //***  Static setup              ***//
    //**********************************//
    
    setupCssStyles();
    
    //**********************************//
    //***  jQuery functions          ***//
    //**********************************//
    
    if(!$.zoomooz) {
        $.zoomooz = {};
    }
    
    $.zoomooz.setup = function(settings) {
        $.zoomooz.defaultSettings = jQuery.extend(constructDefaultSettings(), settings);
    };
    
    $.fn.zoomTo = function(settings) {
        this.each(function() {
            var $this = $(this);
            var elemSettings = setupElementSettings($this, settings);
            zoomTo($this, elemSettings);
            
            if(elemSettings.debug) {
            	if($("#debug").length===0) {
					$(elemSettings.root).append('<div id="debug"><div>');
				} else {
					$("#debug").html("");
				}
				showDebug($this,elemSettings);
            } else {
            	if($("#debug").length!==0) {
					$("#debug").html("");
				}
            }
        });
        
        return this;
    };
    
    //**********************************//
    //***  Setup functions           ***//
    //**********************************//
    
    function setupElementSettings($elem, settings) {
        if(!$.zoomooz.defaultSettings) {
            $.zoomooz.setup();
        }
        
        var defaultSettings = $.zoomooz.defaultSettings;
        var elementSettings = jQuery.extend({},settings);
        
        for(var key in defaultSettings) {
            if (defaultSettings.hasOwnProperty(key) && !elementSettings[key]) {
                elementSettings[key] = $elem.data(key);
            }
        }
        for(var i=0;i<animationSettings.length;i++) {
            var key = animationSettings[i];
            if(!elementSettings[key]) {
                elementSettings[key] = $elem.data(key);
            }
        }
        
        return jQuery.extend({}, defaultSettings, elementSettings);
    }
    
    /* setup css styles in javascript to not need an extra zoomooz.css file for the user to load.
       having the styles here helps also at keeping the css requirements minimal. */
    function setupCssStyles() {
        var style = document.createElement('style');
        style.type = 'text/css';
        
        var transformOrigin = "";
        helpers.forEachPrefix(function(prefix) {
            transformOrigin += prefix+"transform-origin: 0 0;";
        },true);
           
        // FIXME: how to remove the html height requirement?
        // FIXME: how to remove the transform origin?
        style.innerHTML = "html {height:100%;}" +
                          ".noScroll{overflow:hidden !important;}" +
                          "body.noScroll,html.noScroll body{margin-right:15px;}" +
                          "* {"+transformOrigin+"}";
        
        document.getElementsByTagName('head')[0].appendChild(style);
    }
    
    function constructDefaultSettings() {
        return {
            targetsize: 0.9,
            scalemode: "both",
            root: $(document.body),
            debug: false,
            animationendcallback: null
        };
    }
    
    //**********************************//
    //***  Main zoom function        ***//
    //**********************************//
    
    function zoomTo(elem, settings) {
        var scrollData = handleScrolling(elem, settings);
        
        var rootTransformation;
        var animationendcallback = null;
        
        // computeTotalTransformation does not work correctly if the
        // element and the root are the same
        if(elem[0] !== settings.root[0]) {
            var inv = computeTotalTransformation(elem, settings.root).inverse();
            rootTransformation = computeViewportTransformation(elem, inv, settings);
        	
        	if(settings.animationendcallback) {
                animationendcallback = function() {
                    settings.animationendcallback.call(elem[0]);
                };
            }
        	
        } else {
            rootTransformation = (new PureCSSMatrix()).translate(-scrollData.x,-scrollData.y);
            animationendcallback = function() {
                var $root = $(settings.root);
                var $scroll = scrollData.elem;
                
                $root.setTransformation(new PureCSSMatrix());
                $root.data("original-scroll",null);
                $scroll.removeClass("noScroll");
                $scroll.scrollLeft(scrollData.x);
                $scroll.scrollTop(scrollData.y);
                
                if(settings.animationendcallback) {
                    settings.animationendcallback.call(elem[0]);
                }
            };
        }
    	
        $(settings.root).animateTransformation(rootTransformation, settings, animationendcallback);
        
    }
    
    //**********************************//
    //***  Handle scrolling          ***//
    //**********************************//
    
    function handleScrolling(elem, settings) {
    	
    	var $root = settings.root;
    	var $scroll = $root.parent();
    	
    	if(elem[0] === $root[0]) {
        
            var scrollData = $root.data("original-scroll");
            if(scrollData) {
                return scrollData;
            } else {
                return {"elem": $scroll, "x":0,"y:":0};
            }
            
        } else if(!$root.data("original-scroll")) {
        
            // safari
            var scrollY = $root.scrollTop();
            var scrollX = $root.scrollLeft();
            var elem = $root;
            
            // moz
            if(!scrollY) {
                scrollY = $scroll.scrollTop();
                scrollX = $scroll.scrollLeft();
                elem = $scroll;
            }
            
            var scrollData = {"elem":elem,"x":scrollX,"y":scrollY};
            $root.data("original-scroll",scrollData);
            
            elem.addClass("noScroll");
            elem.scrollTop(0);
            elem.scrollLeft(0);
            
            var transformStr = "translate(-"+scrollX+"px,-"+scrollY+"px)";
            helpers.forEachPrefix(function(prefix) {
                $root.css(prefix+"transform", transformStr);
            });
            
            return scrollData;
	    }
	}
			
    //**********************************//
    //***  Element positioning       ***//
    //**********************************//
    
    function computeViewportTransformation(elem, endtrans, settings) {
        var zoomAmount = settings.targetsize;
        var zoomMode = settings.scalemode;
        var zoomParent = settings.root;
        var zoomViewport = $(zoomParent).parent();
        
        var dw = zoomViewport.width();
        var dh = zoomViewport.height();
        
        var relw = dw/elem.outerWidth();
        var relh = dh/elem.outerHeight();
        
        var scale;
        if(zoomMode=="width") {
            scale = zoomAmount*relw;
        } else if(zoomMode=="height") {
            scale = zoomAmount*relh;
        } else if(zoomMode=="both") {
            scale = zoomAmount*Math.min(relw,relh);
        } else if(zoomMode=="scale") {
        	scale = zoomAmount;
        } else {
            console.log("wrong zoommode");
            return;
        }
        
        var xoffset = (dw-elem.outerWidth()*scale)/2.0;
        var yoffset = (dh-elem.outerHeight()*scale)/2.0;
        
        var xrotorigin = dw/2.0;
        var yrotorigin = dh/2.0;
        
        /* fix for body margins, hope that this does not break anything .. */
        /* see also the part of the fix that is in computeTotalTransformation! */
        var xmarginfix = -parseFloat(zoomParent.css("margin-left")) || 0;
        var ymarginfix = -parseFloat(zoomParent.css("margin-top")) || 0;
        var offsetStr = printFixedNumber(xrotorigin)+"px "+printFixedNumber(yrotorigin)+"px";
        
        helpers.forEachPrefix(function(prefix) {
             zoomParent.css(prefix+"transform-origin", offsetStr);
        });
        
        var viewportTransformation = 
            (new PureCSSMatrix())
            .translate(xmarginfix,ymarginfix)
            .translate(-xrotorigin,-yrotorigin)
            .translate(xoffset,yoffset)
            .scale(scale,scale)
            .multiply(endtrans)
            .translate(xrotorigin,yrotorigin);
        
        return viewportTransformation;
    }
    
    //**********************************//
    //***  Debugging positioning     ***//
    //**********************************//
    
    function calcPoint(e,x,y) {
        return [e.a*x+e.c*y+e.e,e.b*x+e.d*y+e.f];
    }
    
    function showDebug(elem, settings) {
        var e = computeTotalTransformation(elem, settings.root).elements();
        displayLabel(calcPoint(e,0,0));
        displayLabel(calcPoint(e,0,elem.outerHeight()));
        displayLabel(calcPoint(e,elem.outerWidth(),elem.outerHeight()));
        displayLabel(calcPoint(e,elem.outerWidth(),0));
    }
    
    function displayLabel(pos) {
        var labelStyle = "width:4px;height:4px;background-color:red;position:absolute;margin-left:-2px;margin-top:-2px;";
        labelStyle += 'left:'+pos[0]+'px;top:'+pos[1]+'px;';
        var label = '<div class="debuglabel" style="'+labelStyle+'"></div>';
        $("#debug").append(label);
    }
    
    //**********************************//
    //***  Calculating element       ***//
    //***  total transformation      ***//
    //**********************************//
    
    /* Based on:
     * jQuery.fn.offset
     */
    function computeTotalTransformation(input, transformationRootElement) {
        var elem = input[0];
        if( !elem || !elem.ownerDocument ) {
            return null;
        }
        
        var totalTransformation = new PureCSSMatrix();
        
        var trans;
        if ( elem === elem.ownerDocument.body ) {
            var bOffset = jQuery.offset.bodyOffset( elem );
            trans = new PureCSSMatrix();
            trans = trans.translate(bOffset.left, bOffset.top);
            totalTransformation = totalTransformation.multiply(trans);
            return totalTransformation;
        }
        
        var support;
        if(jQuery.offset.initialize) {
            jQuery.offset.initialize();
            support = {
                fixedPosition:jQuery.offset.supportsFixedPosition,
                doesNotAddBorder:jQuery.offset.doesNotAddBorder,
                doesAddBorderForTableAndCells:jQuery.support.doesAddBorderForTableAndCells,
                subtractsBorderForOverflowNotVisible:jQuery.offset.subtractsBorderForOverflowNotVisible
            }
        } else {
            support = jQuery.support;
        }
        
        var offsetParent = elem.offsetParent;
        var doc = elem.ownerDocument;
        var computedStyle;
        var docElem = doc.documentElement;
        var body = doc.body;
        var root = transformationRootElement[0];
        var defaultView = doc.defaultView;
        var prevComputedStyle;
        if(defaultView) {
            prevComputedStyle = defaultView.getComputedStyle( elem, null );
        } else {
            prevComputedStyle = elem.currentStyle;
        }
        
        /*
        function offsetParentInsideRoot($elem, $root) {
            // FIXME:
            // wondering, should this be $root.closest()
            // or $root.parent().closest...
            var $viewport = $root.parent();
            var $offsetParent = $elem.offsetParent();
            return ($viewport[0]==$offsetParent[0]) || $viewport.closest($offsetParent).length==0;
        }
        
        console.log("inside root",offsetParentInsideRoot(input, transformationRootElement));
        */
        
        var top = elem.offsetTop;
        var left = elem.offsetLeft;
        
        var transformation = constructTransformation().translate(left,top);
        transformation = transformation.multiply(constructTransformation(elem));
        totalTransformation = transformation.multiply((totalTransformation));
        // loop from node down to root
        while ( (elem = elem.parentNode) && elem !== root) {
            top = 0; left = 0;
            if ( support.fixedPosition && prevComputedStyle.position === "fixed" ) {
                break;
            }
            computedStyle = defaultView ? defaultView.getComputedStyle(elem, null) : elem.currentStyle;
            top  -= elem.scrollTop;
            left -= elem.scrollLeft;
            if ( elem === offsetParent ) {
                top  += elem.offsetTop;
                left += elem.offsetLeft;
                if ( support.doesNotAddBorder && !(support.doesAddBorderForTableAndCells && /^t(able|d|h)$/i.test(elem.nodeName)) ) {
                    top  += parseFloat( computedStyle.borderTopWidth  ) || 0;
                    left += parseFloat( computedStyle.borderLeftWidth ) || 0;
                }
                offsetParent = elem.offsetParent;
            }
            if ( support.subtractsBorderForOverflowNotVisible && computedStyle.overflow !== "visible" ) {
                top  += parseFloat( computedStyle.borderTopWidth  ) || 0;
                left += parseFloat( computedStyle.borderLeftWidth ) || 0;
            }
            prevComputedStyle = computedStyle;
            
            if(elem.offsetParent==root) {
                top -= parseFloat($(elem.offsetParent).css("margin-top")) || 0;
                left -= parseFloat($(elem.offsetParent).css("margin-left")) || 0;
            }
            
            transformation = constructTransformation().translate(left,top);
            transformation = transformation.multiply(constructTransformation(elem));
            totalTransformation = transformation.multiply(totalTransformation);
        
        }
        
        top = 0;
        left = 0;
        
        // fixme: should disable these for non-body roots?
        if ( prevComputedStyle.position === "relative" || prevComputedStyle.position === "static" ) {
            top  += body.offsetTop;
            left += body.offsetLeft;
        }
        if ( support.fixedPosition && prevComputedStyle.position === "fixed" ) {
            top  += Math.max( docElem.scrollTop, body.scrollTop );
            left += Math.max( docElem.scrollLeft, body.scrollLeft );
        }
        
        var itertrans = (new PureCSSMatrix()).translate(left,top);
        totalTransformation = totalTransformation.multiply(itertrans);
        
        return totalTransformation;
        
    }
    
    //**********************************//
    //***  Helpers                   ***//
    //**********************************//
    
    function printFixedNumber(x) {
        return Number(x).toFixed(6);
    }
    
    function constructTransformation(elem) {
        var rawTrans = helpers.getElementTransform(elem);
        if(!rawTrans) {
            return new PureCSSMatrix();
        } else {
            return new PureCSSMatrix(rawTrans);
        }
    }  
    
})(jQuery);