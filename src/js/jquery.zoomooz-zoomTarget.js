/*
 * jquery.zoomooz-zoomTarget.js, part of:
 * http://janne.aukia.com/zoomooz
 *
 * LICENCE INFORMATION:
 *
 * Copyright (c) 2010 Janne Aukia (janne.aukia.com)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL Version 2 (GPL-LICENSE.txt) licenses.
 *
 */

/*jslint sub: true */

(function($) {
    "use strict";

    if(!$.zoomooz) {
        $.zoomooz = {};
    }

    //**********************************//
    //***  Variables                 ***//
    //**********************************//

    var helpers = $.zoomooz.helpers;

    //**********************************//
    //***  jQuery functions          ***//
    //**********************************//

    $.fn.zoomTarget = function(baseSettings) {
        this.each(function() {
            var settings = $(this).zoomSettings(baseSettings);
            setupClickHandler($(this),$(this),settings);
        });
    };

    //**********************************//
    //***  Helper functions          ***//
    //**********************************//

    function setupClickHandler(clickTarget, zoomTarget, settings) {
        clickTarget.addClass("zoomTarget");

        if(!settings.animationendcallback) {
            if(!settings.closeclick) {
                settings.animationendcallback = function() {
                    $(".selectedZoomTarget").removeClass("selectedZoomTarget zoomNotClickable");
                    clickTarget.addClass("selectedZoomTarget zoomNotClickable");
                };
            } else {
                settings.animationendcallback = function() {
                    $(".selectedZoomTarget").removeClass("selectedZoomTarget zoomNotClickable");
                    clickTarget.addClass("selectedZoomTarget");
                };
            }
        }

        var zoomContainer = zoomTarget.closest(".zoomContainer");
        if(zoomContainer.length!==0) {
            settings.root = zoomContainer;
        }

        var $root = settings.root;

        if(!$root.hasClass("zoomTarget")) {

            var rootSettings = $root.zoomSettings({});

            rootSettings.animationendcallback = function() {
                var $elem = $(this);
                $(".selectedZoomTarget").removeClass("selectedZoomTarget zoomNotClickable");
                $elem.addClass("selectedZoomTarget zoomNotClickable");
                $elem.parent().addClass("selectedZoomTarget zoomNotClickable");
            };

            setupClickHandler($root,$root,rootSettings);
            setupClickHandler($root.parent(),$root,rootSettings);

            // FIXME: there could be many of these called simultaneously,
            // don't know what would happen then
            $root.click();
        }

        clickTarget.on("click", function(evt) {

            // closeclick not available here...
            if(settings.closeclick && zoomTarget.hasClass("selectedZoomTarget")) {
                settings.root.click();
            } else {
                zoomTarget.zoomTo(settings);
            }
            evt.stopPropagation();
        });
    }

    //**********************************//
    //***  Setup functions           ***//
    //**********************************//

    /* setup css styles in javascript to not need an extra zoomooz.css file for the user to load.
       having the styles here helps also at keeping the css requirements minimal. */
    function setupCssStyles() {
        var style = document.createElement('style');
        style.type = 'text/css';

        function setupSelectionCss(enabled) {
            var selectionString = "-webkit-touch-callout: "+(enabled?"default":"none")+";";
            helpers.forEachPrefix(function(prefix) {
                selectionString += prefix+"user-select:"+(enabled?"text":"none")+";";
            },true);
            return selectionString;
        }

        // FIXME: how to remove the html height requirement?
        // FIXME: how to remove the transform origin?
        style.innerHTML = ".zoomTarget{"+setupSelectionCss(false)+"}"+
                          ".zoomTarget:hover{cursor:pointer!important;}"+
                          ".zoomNotClickable{"+setupSelectionCss(true)+"}"+
                          ".zoomNotClickable:hover{cursor:auto!important;}"+
                          /* padding to fix margin collapse issues */
                          ".zoomContainer{position:relative;padding:1px;margin:-1px;}";

        document.getElementsByTagName('head')[0].appendChild(style);
    }

    //**********************************//
    //***  Static setup              ***//
    //**********************************//

    setupCssStyles();

    // make all elements with the zoomTarget class zooming
    $(document).ready(function() {
        // this needs to be after the "$.fn.zoomTarget" has been initialized
        $(".zoomTarget").zoomTarget();
    });

})(jQuery);
