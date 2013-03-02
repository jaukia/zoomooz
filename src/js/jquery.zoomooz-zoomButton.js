/*
 * jquery.zoomooz-zoomButton.js, part of:
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

    $.fn.zoomButton = function(baseSettings) {
        this.each(function() {
            var settings = setupZoomButtonSettings($(this),baseSettings);
            setupClickHandler($(this),settings);
        });
    };

    //**********************************//
    //***  Setup functions           ***//
    //**********************************//

    function setupZoomButtonSettings($elem, settings) {

        var defaultSettings = constructDefaultSettings();
        var elementSettings = jQuery.extend({},settings);

        // FIXME: could move the core declarative stuff to a separate lib or file

        for(var key in defaultSettings) {
            if (defaultSettings.hasOwnProperty(key) && !elementSettings[key]) {
                if(defaultSettings[key] instanceof jQuery) {
                    elementSettings[key] = $($elem.data(key));
                } else {
                    elementSettings[key] = $elem.data(key);
                }
            }
        }

        return jQuery.extend({}, defaultSettings, elementSettings);
    }

    function constructDefaultSettings() {
        return {
            type: "next",
            root: $(document.body),
            wrap: "true"
        };
    }

    //**********************************//
    //***  Helper functions          ***//
    //**********************************//

    function setupClickHandler(clickTarget, settings) {

        clickTarget.addClass("zoomButton");

        var $root;

        if(settings.root.hasClass("zoomContainer")) {
            $root = settings.root;
        } else {
            $root = settings.root.find(".zoomContainer");
        }

        var displayList = (function() {
            var listData = jQuery.makeArray($root.find(".zoomTarget"));

            function _getIndex(elem) {
                return listData.indexOf(elem);
            }

            function _getNext(elem) {
                var index = _getIndex(elem)+1;
                if(index<listData.length && index!==0) {
                    return listData[index];
                } else {
                    return null;
                }
            }

            function _getPrev(elem) {
                var index = _getIndex(elem)-1;
                if(index<0) {
                    return null;
                } else {
                    return listData[index];
                }
            }

            function _getFirst() {
                return listData[0];
            }

            function _getLast() {
                return listData[listData.length-1];
            }

            return {
                next: _getNext,
                prev: _getPrev,
                last: _getLast,
                first: _getFirst
            };
        }());

        clickTarget.on("click", function(evt) {

            var target;
            var performZoom = true;

            var $selected = $root.find(".selectedZoomTarget");

            if($selected.length===0) {
                $selected = displayList.first();
            }

            if(settings.type.indexOf("prev")===0) {
                target = displayList.prev($selected[0]);
                if(target === null) {
                    if(settings.wrap) {
                        target = displayList.last();
                    } else {
                        performZoom = false;
                    }
                }
            } else {
                target = displayList.next($selected[0]);
                if(target === null) {
                    if(settings.wrap) {
                        target = displayList.first();
                    } else {
                        performZoom = false;
                    }
                }
            }

            if(performZoom) {
                // not this easy! would need to read the data fields
                //target.zoomTo();

                // FIXME: hacky...
                target.click();
            } else {
                // don't do anything if no wrap
                // (would be great if the button was disabled)
            }

            evt.stopPropagation();
        });
    }

    //**********************************//
    //***  Static setup              ***//
    //**********************************//

    // make all elements with the zoomButton class activate
    $(document).ready(function() {
        // this needs to be after the "$.fn.zoomButton" has been initialized
        $(".zoomButton").zoomButton();
    });

})(jQuery);
