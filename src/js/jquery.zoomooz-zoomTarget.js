/*
 * jquery.zoomooz-zoomtarget.js, part of:
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
    
    $.fn.zoomTarget = function(settings) {
        if(!$.zoomooz.defaultSettings) {
            $.zoomooz.setup();
        }
        
        if(!settings) {
            settings = {};
        }
        
        settings.animationendcallback = function() {
            $(".selectedZoomTarget").removeClass("selectedZoomTarget");
        	$(this).addClass("selectedZoomTarget");
        };
        
        var setupClickHandler = function(clickTarget,zoomTarget, settings) {
            clickTarget.addClass("zoomTarget");
        
            var zoomContainer = zoomTarget.closest(".zoomContainer");
            if(zoomContainer.length!=0) {
                settings.root = zoomContainer;
            }
            
            if(!settings.root) {
                settings.root = $.zoomooz.defaultSettings.root;
            }
            
             if(!settings.root.hasClass("zoomTarget")) {
            
                // fixme, if element has data fields for setting duration etc,
                // these will not be inherited by the root. which might or might not
                // make sense
                
                var rootSettings = {};
                
                rootSettings.animationendcallback = function() {
                    var $elem = $(this);
                    $(".selectedZoomTarget").removeClass("selectedZoomTarget");
                    $elem.addClass("selectedZoomTarget");
                    $elem.parent().addClass("selectedZoomTarget");
                };
                
                setupClickHandler(settings.root,settings.root,rootSettings);
                setupClickHandler(settings.root.parent(),settings.root,rootSettings);
                
                settings.root.click();
            }
            
            clickTarget.on("click", function(evt) {
                zoomTarget.zoomTo(settings);
                evt.stopPropagation();
            });
        }
        
        this.each(function() {
            setupClickHandler($(this),$(this),jQuery.extend({}, settings));
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
                          ".selectedZoomTarget{"+setupSelectionCss(true)+"}"+
                          ".selectedZoomTarget:hover{cursor:auto!important;}"+
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
