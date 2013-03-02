/*
 * jquery.zoomooz-zoomContainer.js, part of:
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

    //var helpers = $.zoomooz.helpers;


    //**********************************//
    //***  jQuery functions          ***//
    //**********************************//

    $.fn.zoomContainer = function(settings) {

        // add next and previous calls to the canvas
        // (auto detect next and previous buttons)

    };

    //**********************************//
    //***  Static setup              ***//
    //**********************************//

    // FIXME: move zoomContainer styling here?
    //setupCssStyles();

    // make all elements with the zoomContainer class zooming containers
    $(document).ready(function() {
        // this needs to be after the "$.fn.zoomContainer" has been initialized
        $(".zoomContainer").zoomContainer();
    });

})(jQuery);
