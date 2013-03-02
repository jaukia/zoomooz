/*
 * jquery.zoomooz-core.js, part of:
 * http://janne.aukia.com/zoomooz
 *
 * Version history:
 * 1.1.5 zoom for scrolled pages without flickering
 * 1.1.0 carousel prev/next navigation
 * 1.0.6 support for jQuery 1.9
 * 1.0.4 fixed examples, iphone tuneups, transform offset fix
 * 1.0.3 added closeclick, code structuring
 * 1.0.2 bug fix on endcallback resetting for native animation
 * 1.0.1 declarative syntax and fixes
 * 0.9.2 working scrolling
 * 0.9.1 simplifying code base and scrolling for non-body zoom roots
 * 0.9.0 fixing margin on first body child
 * 0.8.9 support for jQuery 1.7
 * 0.8.8 fixed a bug with 90 deg rotations
 * 0.8.7 fixed a bug with settings and a couple of demos
 * 0.8.6 fixed a bug with non-body zoom root
 * 0.8.5 basic IE9 support
 * 0.8.1 basic support for scrolling
 * 0.8.0 refactored position code to a separate file
 * 0.7.2 fixed a bug with skew in Webkit
 * 0.7.1 fixed bugs with FF4
 * 0.7.0 support for non-body zoom root
 * 0.6.9 better settings management
 * 0.6.8 root element tuning
 * 0.6.7 adjustable zoom origin (not fully working yet)
 * 0.6.5 zoom origin to center
 * 0.6.3 basic Opera support
 * 0.6.1 refactored to use CSSMatrix classes
 * 0.5.1 initial public version
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

    // document.ready needed for scroll bar width
    // calculation
    setupCssStyles();

    //**********************************//
    //***  jQuery functions          ***//
    //**********************************//

    if(!$.zoomooz) {
        $.zoomooz = {};
    }

    /* this can be used for setting the default settings for zoomooz explicitly. */
    $.zoomooz.setup = function(settings) {
        $.zoomooz.defaultSettings = jQuery.extend(constructDefaultSettings(), settings);
    };

    /* returns the zooming settings of a particular element. used by zoomTarget. */
    $.fn.zoomSettings = function(settings) {
        var retValue;
        this.each(function() {
            var $elem = $(this);
            retValue = setupElementSettings($elem, settings);
        });
        return retValue;
    };

    /* the main zooming method. */
    $.fn.zoomTo = function(settings, skipElementSettings) {
        this.each(function() {
            var $this = $(this);

            if(!skipElementSettings) {
                settings = $this.zoomSettings(settings);
            }

            zoomTo($this, settings);

            if(settings.debug) {
                if($("#debug").length===0) {
                    $(settings.root).append('<div id="debug"><div>');
                } else {
                    $("#debug").html("");
                }
                showDebug($this,settings);
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

    function setupElementSettings($elem, baseSettings) {

        var settings = jQuery.extend({}, baseSettings);

        if(!$.zoomooz.defaultSettings) {
            $.zoomooz.setup();
        }

        var defaultSettings = $.zoomooz.defaultSettings;
        var elementSettings = jQuery.extend({},settings);

        var key;

        for(key in defaultSettings) {
            if (defaultSettings.hasOwnProperty(key) && !elementSettings[key]) {
                elementSettings[key] = $elem.data(key);
            }
        }

        // FIXME: it would be better, that the animationSettings
        // would come from the jquery.zoomooz-anim file somehow
        for(var i=0;i<animationSettings.length;i++) {
            key = animationSettings[i];
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
                          "* {"+transformOrigin+"}";

        document.getElementsByTagName('head')[0].appendChild(style);

        $(document).ready(function() {
            var scrollBarWidth = window.innerWidth - $("body").width();
            style.innerHTML += "body.noScroll,html.noScroll body{margin-right:"+scrollBarWidth+"px;}";
        });

    }

    function constructDefaultSettings() {
        var retObject = {
            targetsize: 0.9,
            scalemode: "both",
            root: $(document.body),
            debug: false,
            animationendcallback: null,
            closeclick: false
        };

        // FIXME: feat detection would be better
        var isFF = (window.mozInnerScreenX !== undefined);
        retObject.scrollresetbeforezoom = isFF;

        return retObject;
    }

    //**********************************//
    //***  Main zoom function        ***//
    //**********************************//

    function zoomTo(elem, settings) {

        // scrolling:

        var useScrollResetBeforeZoom = settings.scrollresetbeforezoom;

        var scrollData = null;
        var startedZoomFromScroll;

        (function() {
            var $root = settings.root;
            var $scroll = $root.parent();

            if(elem[0] === $root[0]) {
                scrollData = getExistingScrollData($root, $scroll);
            } else if(!$root.data("original-scroll")) {
                startedZoomFromScroll = true;
                scrollData = storeNewScrollData($root, $scroll, useScrollResetBeforeZoom);
            } else if(!useScrollResetBeforeZoom) {
                scrollData = getExistingScrollData($root, $scroll);
            }
        }());

        var rootTransformation;
        var animationendcallback = null;

        setTransformOrigin(settings.root);

        var animScrollData = null;

        if(elem[0] !== settings.root[0]) {
            var inv = computeTotalTransformation(elem, settings.root).inverse();

            if(!useScrollResetBeforeZoom) {
                animScrollData = scrollData;
            }

            rootTransformation = computeViewportTransformation(elem, inv, animScrollData, settings);

            if(settings.animationendcallback) {
                animationendcallback = function() {
                    settings.animationendcallback.call(elem[0]);
                };
            }

        } else {

            if(useScrollResetBeforeZoom) {
                rootTransformation = (new PureCSSMatrix()).translate(-scrollData.x,-scrollData.y);
            }

            animationendcallback = function() {
                var $root = $(settings.root);
                var $scroll = scrollData.elem;

                $scroll.removeClass("noScroll");

                $root.setTransformation(new PureCSSMatrix());
                $root.data("original-scroll",null);

                $(document).off("touchmove");

                if(useScrollResetBeforeZoom) {

                    // this needs to be after the setTransformation and
                    // done with window.scrollTo to not have iPhone repaints
                    if($scroll[0]==document.body || $scroll[0]==window) {
                        window.scrollTo(scrollData.x,scrollData.y);
                    } else {
                        $scroll.scrollLeft(scrollData.x);
                        $scroll.scrollTop(scrollData.y);
                    }

                }

                if(settings.animationendcallback) {
                    settings.animationendcallback.call(elem[0]);
                }
            };
        }

        var animationstartedcallback = null;
        if(useScrollResetBeforeZoom && scrollData && scrollData.animationstartedcallback) {
            animationstartedcallback = scrollData.animationstartedcallback;
        }

        if(!startedZoomFromScroll) {
            animScrollData = false;
        }

        $(settings.root).animateTransformation(rootTransformation, settings, animScrollData, animationendcallback, animationstartedcallback);
    }

    //**********************************//
    //***  Handle scrolling          ***//
    //**********************************//


        function getExistingScrollData($root, $scroll) {
            var scrollData = $root.data("original-scroll");
            if(!scrollData) {
                scrollData = {"elem": $scroll, "x":0,"y:":0};
            }
            return scrollData;
        }

        function storeNewScrollData($root, $scroll, useScrollResetBeforeZoom) {
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

            $(document).on("touchmove", function(e) {
                e.preventDefault();
            });

            var transformStr = "translate(-"+scrollX+"px,-"+scrollY+"px)";
            helpers.forEachPrefix(function(prefix) {
                $root.css(prefix+"transform", transformStr);
            });

            elem.addClass("noScroll");

            if(useScrollResetBeforeZoom) {
                scrollData.animationstartedcallback = function() {

                    // this needs to be after the setTransformation and
                    // done with window.scrollTo to not have iPhone repaints
                    if(elem[0]==document.body || elem[0]==document) {
                        window.scrollTo(0,0);
                    } else {
                        elem.scrollLeft(0);
                        elem.scrollTop(0);
                    }

                };
            }

            return scrollData;
        }

    //**********************************//
    //***  Element positioning       ***//
    //**********************************//

    function setTransformOrigin(zoomParent) {
        var zoomViewport = $(zoomParent).parent();

        var dw = zoomViewport.width();
        var dh = zoomViewport.height();

        var xrotorigin = dw/2.0;
        var yrotorigin = dh/2.0;

        var offsetStr = printFixedNumber(xrotorigin)+"px "+printFixedNumber(yrotorigin)+"px";

        helpers.forEachPrefix(function(prefix) {
             zoomParent.css(prefix+"transform-origin", offsetStr);
        });
    }

    function computeViewportTransformation(elem, endtrans, scrollData, settings) {
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

        var initTransformation = (new PureCSSMatrix());
        if(scrollData) {
            initTransformation = initTransformation.translate(scrollData.x,scrollData.y);
        }

        var viewportTransformation =
            initTransformation
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
            };
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