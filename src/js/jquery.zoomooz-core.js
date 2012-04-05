/*
 * jquery.zoomooz-core.js, part of:
 * http://janne.aukia.com/zoomooz
 *
 * Version history:
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
    
    var default_settings;
    var helpers = $.zoomooz.helpers;

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
        default_settings = jQuery.extend(constructDefaultSettings(), settings);
    };
    
    $.fn.zoomTo = function(settings) {
        if(!default_settings) {
            $.zoomooz.setup();
        }
        
        // first argument empty object to ensure that the default settings
        // are not modified
        settings = jQuery.extend({}, default_settings, settings);
        
        // um, does it make any sense to zoom to each of the matches?
        this.each(function() {
        
            zoomTo($(this), settings);
            
            if(settings.debug) {
            	if($("#debug").length===0) {
					$(settings.root).append('<div id="debug"><div>');
				} else {
					$("#debug").html("");
				}
				showDebug($(this),settings);
            } else {
            	if($("#debug").length!==0) {
					$("#debug").html("");
				}
            }
        });
        
        return this;
    };
    
    $.fn.makeZooming = function(settings) {
        if(!default_settings) {
            $.zoomooz.setup();
        }
        
        // first argument empty object to ensure that 
        // the default settings are not modified
        settings = jQuery.extend({}, default_settings, settings);
        
        var setupClickHandler = function(clickTarget,zoomTarget) {
            clickTarget.click(function(evt) {
                zoomTarget.zoomTo(settings);
                evt.stopPropagation();
            });
            clickTarget.addClass("zoomTarget");
        }
        
        this.each(function() {
            setupClickHandler($(this),$(this));
        });
        
        if(!settings.root.hasClass("zoomTarget")) {
            setupClickHandler(settings.root,settings.root);
            setupClickHandler(settings.root.parent(),settings.root);
            
            settings.root.click();
        }
    }
    
    //**********************************//
    //***  Setup functions           ***//
    //**********************************//
    
    /* setup css styles in javascript to not need an extra zoomooz.css file for the user to load.
       having the styles here helps also at keeping the css requirements minimal. */
    function setupCssStyles() {
        var style = document.createElement('style');
        style.type = 'text/css';
        
        var setPrefix = function(val) {
            var retVal = "";
            helpers.forEachPrefix(function(prefix) {
                retVal += prefix+"transform-origin: "+val+" "+val+";";
            });
            return retVal;
        }
        
        var textSelectionDisabling = "-webkit-touch-callout: none;";
        helpers.forEachPrefix(function(prefix) {
            textSelectionDisabling += prefix+"user-select:none;";
        },true);
            
        // FIXME: could we remove the body origin assignment?
        // FIXME: do we need the html and body assignments always?
        style.innerHTML = ".noScroll{overflow:hidden !important;}" +
                          ".zoomTarget{"+textSelectionDisabling+"}"+
                          ".zoomTarget:hover{cursor:pointer!important;}"+
                          ".selectedZoomTarget:hover{cursor:auto!important;}"+
                          "* {"+setPrefix("0")+"} body {"+setPrefix("50%")+"}";
        
        document.getElementsByTagName('head')[0].appendChild(style);
    }
    
    function constructDefaultSettings() {
        return {
            targetsize: 0.9,
            scalemode: "both",
            duration: 1000,
            root: $(document.body),
            debug: false
        };
    }
    
    //**********************************//
    //***  Main zoom function        ***//
    //**********************************//
    
    function zoomTo(elem, settings) {
        var scrollData = handleScrolling(elem, settings);
        
        var rootTransformation;
        var animateEndCallback = null;
        
        // computeTotalTransformation does not work correctly if the
        // element and the root are the same
        if(elem[0] !== settings.root[0]) {
        	rootTransformation = computeViewportTransformation(elem, 
        	    computeTotalTransformation(elem, settings.root).inverse(), 
        	    settings);
        	    
        	animateEndCallback = function() {
        	    $(".zoomTarget").removeClass("selectedZoomTarget");
        	    elem.addClass("selectedZoomTarget");
        	}
        } else {
            rootTransformation = (new PureCSSMatrix()).translate(-scrollData.x,-scrollData.y);
            animateEndCallback = function() {
                var $root = $(settings.root);
                var $scroll = scrollData.elem;
                
                $root.setTransformation(new PureCSSMatrix());
                $root.data("original-scroll",null);
                $scroll.removeClass("noScroll");
                $scroll.scrollLeft(scrollData.x);
                $scroll.scrollTop(scrollData.y);
                
                $(".zoomTarget").removeClass("selectedZoomTarget");
        	    elem.addClass("selectedZoomTarget");
        	    elem.parent().addClass("selectedZoomTarget");
            };
        }
    	
        $(settings.root).animateTransformation(rootTransformation, settings, animateEndCallback);
        
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
            
        } else if(!$scroll.hasClass("noScroll")) {
        
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
        } else {
            console.log("wrong zoommode");
            return;
        }
        
        var xoffset = (dw-elem.outerWidth()*scale)/2.0;
        var yoffset = (dh-elem.outerHeight()*scale)/2.0;
        
        var xrotorigin = dw/2.0;
        var yrotorigin = dh/2.0;
        
        var offsetStr = printFixedNumber(xrotorigin)+"px "+printFixedNumber(yrotorigin)+"px";
        
        helpers.forEachPrefix(function(prefix) {
             zoomParent.css(prefix+"transform-origin", offsetStr);
        });
        
        var viewportTransformation = 
            (new PureCSSMatrix())
            .translate(-xrotorigin,-yrotorigin)
            .translate(xoffset,yoffset)
            .scale(scale,scale)
            .multiply(endtrans)
            .translate(xrotorigin,yrotorigin)
        
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
        
        var top = elem.offsetTop;
        var left = elem.offsetLeft;
        
        var transformation = constructTransformation().translate(left,top);
        transformation = transformation.multiply(constructTransformation(elem));
        totalTransformation = transformation.multiply((totalTransformation));
        // loop from node down to root
        while ( (elem = elem.parentNode) && elem !== body && elem !== docElem && elem !== root) {
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
            
            transformation = constructTransformation().translate(left,top);
            transformation = transformation.multiply(constructTransformation(elem));
            totalTransformation = transformation.multiply(totalTransformation);
        
        }
        
        top = 0; left = 0;
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