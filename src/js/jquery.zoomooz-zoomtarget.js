/*
 * jquery.zoomooz-extras.js, part of:
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
    //***  Static setup              ***//
    //**********************************//
    
    setupCssStyles();
    
    //**********************************//
    //***  jQuery functions          ***//
    //**********************************//
    
    $.fn.zoomTarget = function(settings) {
        if(!$.zoomooz.defaultSettings) {
            $.zoomooz.setup();
        }
        
        var elemSettings = jQuery.extend({}, $.zoomooz.defaultSettings, settings);
        elemSettings.animationEndCallback = function() {
            $(".selectedZoomTarget").removeClass("selectedZoomTarget");
        	$(this).addClass("selectedZoomTarget");
        };
        
        var setupClickHandler = function(clickTarget,zoomTarget, settings) {
            clickTarget.click(function(evt) {
                zoomTarget.zoomTo(settings);
                evt.stopPropagation();
            });
            clickTarget.addClass("zoomTarget");
        }
        
        this.each(function() {
            setupClickHandler($(this),$(this),elemSettings);
        });
        
        if(!elemSettings.root.hasClass("zoomTarget")) {
        
            var rootSettings = jQuery.extend({}, $.zoomooz.defaultSettings, settings);
            rootSettings.animationEndCallback = function() {
                var $elem = $(this);
                $(".selectedZoomTarget").removeClass("selectedZoomTarget");
                $elem.addClass("selectedZoomTarget");
                $elem.parent().addClass("selectedZoomTarget");
            };
            
            setupClickHandler(rootSettings.root,rootSettings.root,rootSettings);
            setupClickHandler(rootSettings.root.parent(),rootSettings.root,rootSettings);
            
            rootSettings.root.click();
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
        
        var textSelectionDisabling = "-webkit-touch-callout: none;";
        helpers.forEachPrefix(function(prefix) {
            textSelectionDisabling += prefix+"user-select:none;";
        },true);
           
        // FIXME: how to remove the html height requirement?
        // FIXME: how to remove the transform origin?
        style.innerHTML = ".zoomTarget{"+textSelectionDisabling+"}"+
                          ".zoomTarget:hover{cursor:pointer!important;}"+
                          ".selectedZoomTarget:hover{cursor:auto!important;}"+
                          
        document.getElementsByTagName('head')[0].appendChild(style);
    }
    
})(jQuery);