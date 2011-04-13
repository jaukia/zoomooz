/*
 * jquery.zoomooz.js, part of:
 * http://janne.aukia.com/zoomooz
 *
 * Version history:
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
    
    var css_matrix_class;
    var default_settings;
    
    //**********************************//
    //***  jQuery functions          ***//
    //**********************************//
    
    $.zoomMooz = {};
    $.zoomMooz.setup = function(settings) {
        default_settings = jQuery.extend(constructDefaultSettings(), settings);
        css_matrix_class = setupMatrixClass(default_settings);
    };
    
    $.fn.debug = function(settings) {
        if(!default_settings) {
            $.zoomMooz.setup();
        }
        
        settings = jQuery.extend(default_settings, settings);
        
        if($("#debug").length===0) {
            $(settings.root).append('<div id="debug"><div>');
        } else {
            $("#debug").html("");
        }
        this.each(function() {
            if($(this)[0] != settings.root[0]) {
                showDebug($(this),settings);
            }
        });
    };
    
    $.fn.zoomTo = function(settings) {
        if(!default_settings) {
            $.zoomMooz.setup();
        }
        settings = jQuery.extend(default_settings, settings);
        
        // um, does it make any sense to zoom to each of the matches?
        this.each(function() {
            zoomTo($(this), settings);
        });
        
        return this;
    };
    
    //**********************************//
    //***  Setup functions           ***//
    //**********************************//
    
    function constructDefaultSettings() {
        return {
            targetsize: 0.9,
            scalemode: "both",
            duration: 1000,
            easing: "ease",
            root: $(document.body),
            nativeanimation: false
        };
    }
    
    function setupMatrixClass(settings) {
        // could use WebKitCSSMatrix in webkit as well, which would
        // speed up computation a bit, but this eases debugging
        return PureCSSMatrix;
    }
    
    //**********************************//
    //***  Main zoom function        ***//
    //**********************************//
    
    function zoomTo(elem, settings) {
        handleScrolling(elem, settings);
        
        if(elem[0] === settings.root[0]) {
        	
        	// computeTotalTransformation does not work correctly if the
        	// element and the root are the same
        	
        	$(settings.root).animateTransformation(new css_matrix_class(), settings, css_matrix_class);
        	
        } else {
        	
        	var transform = computeTotalTransformation(elem, settings.root);
        	var inverse = (transform) ? transform.inverse(): null;
        	var roottrans = computeViewportTransformation(elem, inverse, settings);
        	
        	$(settings.root).animateTransformation(roottrans, settings, css_matrix_class);
    	}
    }
    
    //**********************************//
    //***  Handle scrolling          ***//
    //**********************************//
    
    function handleScrolling(elem, settings) {
    	var $root = settings.root;
    	
    	// TODO: untested for non-body zoom roots!
    	
    	var $scroll;
    	if($root[0] === document.body) {
    	    $scroll = $("html");
    	} else {
    	    $scroll = $root;
    	}
    	
    	if(elem[0] === $root[0]) {
        
            /*var scrollData = $scroll.data("original-scroll");
            
            if(scrollData) {
                var elem = scrollData[0];
                var scrollX = scrollData[1];
                var scrollY = scrollData[2];
                elem.scrollLeft(scrollX);
                elem.scrollTop(scrollY);
                $scroll.data("original-scroll",null);
            }*/
            
            // release scroll lock
            $scroll.removeClass("noScroll");
            
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
            
            $scroll.addClass("noScroll");
            
            //$scroll.data("original-scroll",[elem,scrollX,scrollY]);
            
            $root.scrollTop(0);
            $root.scrollLeft(0);
            
            var transformStr = "translate(-"+scrollX+"px,-"+scrollY+"px)";
            $root.css("-ms-transform", transformStr);
            $root.css("-webkit-transform", transformStr);
            $root.css("-moz-transform", transformStr);
            $root.css("-o-transform", transformStr);
            
	    }
	}
			
    //**********************************//
    //***  Element positioning       ***//
    //**********************************//
    
    function computeViewportTransformation(elem, endtrans, settings) {
        var zoomAmount = settings.targetsize;
        var zoomMode = settings.scalemode;
        var zoomParent = settings.root;
        
        var dw = $(zoomParent).width();
        var dh = $(zoomParent).height();
        
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
        zoomParent.css("-ms-transform-origin", offsetStr);
        zoomParent.css("-webkit-transform-origin", offsetStr);
        zoomParent.css("-o-transform-origin", offsetStr);
        zoomParent.css("-moz-transform-origin", offsetStr);
        
        var endpostrans = new css_matrix_class();
        endpostrans = endpostrans.translate(-xrotorigin,-yrotorigin);
        endpostrans = endpostrans.translate(xoffset,yoffset);
        endpostrans = endpostrans.scale(scale,scale);
        if(endtrans) {
            endpostrans = endpostrans.multiply(endtrans);
        }
        endpostrans = endpostrans.translate(xrotorigin,yrotorigin);
        
        return endpostrans;
    }
    
    //**********************************//
    //***  Debugging positioning     ***//
    //**********************************//
    
    function calcPoint(e,x,y) {
        return [e.a*x+e.c*y+e.e,e.b*x+e.d*y+e.f];
    }
    
    function showDebug(elem, settings) {
        var transform = computeTotalTransformation(elem, settings.root);
        var e = fetchElements(transform);
        displayLabel(calcPoint(e,0,0));
        displayLabel(calcPoint(e,0,elem.outerHeight()));
        displayLabel(calcPoint(e,elem.outerWidth(),elem.outerHeight()));
        displayLabel(calcPoint(e,elem.outerWidth(),0));
    }
    
    function displayLabel(pos) {
        var label = '<div class="debuglabel" style="left:'+pos[0]+'px;top:'+pos[1]+'px;"></div>';
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
        
        var totalTransformation = new css_matrix_class();
        
        var trans;
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
            
            transformation = constructTransformation().translate(left,top);
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
        
        var itertrans = (new css_matrix_class()).translate(left,top);
        totalTransformation = totalTransformation.multiply(itertrans);
        
        return totalTransformation;
        
    }

    //**********************************//
    //***  CSS Matrix helpers        ***//
    //**********************************//
    
    // also in animtrans
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
    
    function constructTransformation(elem) {
        var rawTrans = getElementTransform(elem);
        if(!rawTrans) {
            return new css_matrix_class();
        } else {
            return new css_matrix_class(rawTrans);
        }
    }
    
    //**********************************//
    //***  Helpers                   ***//
    //**********************************//
    
    function printFixedNumber(x) {
        return Number(x).toFixed(6);
    }
    
    function getElementTransform(elem) {
        return ($(elem).css("-webkit-transform") || 
                $(elem).css("-moz-transform") || 
                $(elem).css("-o-transform") || 
                $(elem).css("-ms-transform") || 
                $(elem).css("transform"));
    }
    
})(jQuery);