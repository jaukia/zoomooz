/*
 * purecssmatrix.js, version 0.10, part of:
 * http://janne.aukia.com/zoomooz
 *
 * 0.10 initial stand-alone version
 *
 * LICENCE INFORMATION:
 *
 * Copyright (c) 2010 Janne Aukia (janne.aukia.com)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL Version 2 (GPL-LICENSE.txt) licenses.
 *
 */
 
 PureCSSMatrix = (function() {
    "use strict";

    //**********************************//
    //***  Variables                 ***//
    //**********************************//
    
    var regexp_is_deg = /deg$/;
    var regexp_filter_number = /([0-9.\-e]+)/g;
    var regexp_trans_splitter = /([a-zA-Z]+)\(([^\)]+)\)/g;
    
    //**********************************//
    //***  WebKitCSSMatrix in        ***//
    //***  pure Javascript           ***//
    //**********************************//
    
    function cssMatrix(trans) {
        if(trans && trans !== null && trans!="none") {
            if(trans instanceof Matrix) {
                this.setMatrix(trans);
            } else {
                this.setMatrixValue(trans);
            }
        } else {
            this.m = Matrix.I(3);
        }
    }
    
    cssMatrix.prototype.setMatrix = function(matr) {
        this.m = matr;
    };
    
    function rawRotationToRadians(raw) {
        var rot = parseFloat(filterNumber(raw));
        if(raw.match(regexp_is_deg)) {
            rot = (2*Math.PI)*rot/360.0;
        }
        return rot;
    }
    
    cssMatrix.prototype.setMatrixValue = function(transString) {
        var mtr = Matrix.I(3);
        var items;
        while((items = regexp_trans_splitter.exec(transString)) !== null) {
            var action = items[1].toLowerCase();
            var val = items[2].split(",");
            var trans;
            if(action=="matrix") {
                trans = Matrix.create([[parseFloat(val[0]),parseFloat(val[2]),parseFloat(filterNumber(val[4]))],
                               [parseFloat(val[1]),parseFloat(val[3]),parseFloat(filterNumber(val[5]))],
                               [                0,                0,                              1]]);
            } else if(action=="translate") {
                trans = Matrix.I(3);
                trans.elements[0][2] = parseFloat(filterNumber(val[0]));
                trans.elements[1][2] = parseFloat(filterNumber(val[1]));
            } else if(action=="scale") {
                var sx = parseFloat(val[0]);
                var sy;
                if(val.length>1) {
                    sy = parseFloat(val[1]);
                } else {
                    sy = sx;
                }
                trans = Matrix.create([[sx, 0, 0], [0, sy, 0], [0, 0, 1]]);
            } else if(action=="rotate") {
                trans = Matrix.RotationZ(rawRotationToRadians(val[0]));
            } else if(action=="skew" || action=="skewx") {
                // TODO: supports only one parameter skew
                trans = Matrix.I(3);
                trans.elements[0][1] = Math.tan(rawRotationToRadians(val[0]));
            } else if(action=="skewy") {
                // TODO: test that this works (or unit test them all!)
                trans = Matrix.I(3);
                trans.elements[1][0] = Math.tan(rawRotationToRadians(val[0]));
            } else {
                console.log("Problem with setMatrixValue", action, val);
            }
            
            mtr = mtr.multiply(trans);
        }
        
        this.m = mtr;
    };
    
    cssMatrix.prototype.multiply = function(m2) {
        return new cssMatrix(this.m.multiply(m2.m));
    };
    
    cssMatrix.prototype.inverse = function() {
        if(Math.abs(this.m.elements[0][0])<0.000001) {
            /* fixes a weird displacement problem with 90 deg rotations */
            this.m.elements[0][0] = 0;
        }
        return new cssMatrix(this.m.inverse());
    };
    
    cssMatrix.prototype.translate = function(x,y) {
        var trans = Matrix.I(3);
        trans.elements[0][2] = x;
        trans.elements[1][2] = y;
        return new cssMatrix(this.m.multiply(trans));
    };
    
    cssMatrix.prototype.scale = function(sx,sy) {
        var trans = Matrix.create([[sx, 0, 0], [0, sy, 0], [0, 0, 1]]);
        return new cssMatrix(this.m.multiply(trans));    
    };
    
    cssMatrix.prototype.rotate = function(rot) {
        var trans = Matrix.RotationZ(rot);
        return new cssMatrix(this.m.multiply(trans));
    };
    
    cssMatrix.prototype.toString = function() {
        var e = this.m.elements;
        var pxstr = "";
        if($.browser.mozilla || $.browser.opera) {
            pxstr = "px";
        }
        return "matrix("+printFixedNumber(e[0][0])+", "+printFixedNumber(e[1][0])+", "+
                         printFixedNumber(e[0][1])+", "+printFixedNumber(e[1][1])+", "+
                         printFixedNumber(e[0][2])+pxstr+", "+printFixedNumber(e[1][2])+pxstr+")";
    };
    
    //****************************************//
    //***  Not part of the WebkitCSSMatrix ***//
    //***  interface (but used in Zoomooz) ***//
    //****************************************//
    
    cssMatrix.prototype.elements = function() {
        var mv = this.m.elements;
        return {"a":mv[0][0],"b":mv[1][0],"c":mv[0][1],
                "d":mv[1][1],"e":mv[0][2],"f":mv[1][2]};
    }
    
    //**********************************//
    //***  Helpers                   ***//
    //**********************************//
    
    function filterNumber(x) {
        return x.match(regexp_filter_number);
    }
    
    function printFixedNumber(x) {
        return Number(x).toFixed(6);
    }

    return cssMatrix;
})();