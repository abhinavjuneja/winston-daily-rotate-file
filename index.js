/**
 * Logger file
 */
"use strict";

var fs = require('mkdirp');
var winston = require('winston');

var config = require('config');
var maxLogFileSize = config.orionConstants.maxLogFileSize;
var _ = require("lodash");
var env = config.env.name;
var logDirectory = !!config.env.prop["logging-path"] ? config.env.prop["logging-path"] : './log';
var loggingLevel = !!config.env.prop["log-level"] ? config.env.prop["log-level"] : 'error';
var consoleLogging = config.env.prop["console-log"] ? config.env.prop["console-log"] : false;
var logger = null;
var loggerUtils = require('./loggerUtils.js');

if (!consoleLogging) {
    fs.sync(logDirectory);
    logger = new winston.Logger({
        transports:
                [new (require('winston-daily-rotate-file'))({
                        name: 'normal',
                        datePattern: 'yyyy-MM-dd',
                        prepend:true,
                        timestamp: true,
                        maxsize:maxLogFileSize,
                        filename: logDirectory + '/.log',
                        colorize: true}),
                    new (require('winston-daily-rotate-file'))({
                        name: 'error',
                        datePattern: 'yyyy-MM-dd-',
                        prepend:true,
                        maxsize:maxLogFileSize,
                        filename: logDirectory + '/error.log',
                        level: 'error',
                        colorize: true})
                ],
        rewriters: [
            (level,msg, meta) => {
                meta.app = "eclipse_backend";
                return meta;
            }
        ]
    });
//   logger.add(winston.transports.Console, {colorize: true});
//	winston.add(winston.transports.File, { filename: 'somefile.log' });
} else {
    logger = new winston.Logger().add(winston.transports.Console, {colorize: true});
}
logger.info("max log file Size", maxLogFileSize)
var severeLog = function (msg, meta, cb) {
    var self = this;
    self.error(msg, meta);
    if (cb) {
        return cb(msg, null);
    }
}


var customLogger = function (moduleName) {
    this.moduleName = moduleName;
    var self = this;
    for (var i in logger) {
        if (logger.hasOwnProperty(i)) {
            (function (i) {
                self[i] = function () {
                    var argsObj = loggerUtils.fetchCorrelationMessageFromCache(moduleName,arguments);
                    
                    var data = parseUserData(arguments)
                    data.correlationId = loggerUtils.fetchCorrelationIdFromCache(arguments);
                    data.moduleName = moduleName;
                    
                    var argsLength = argsObj.length;
                    argsObj[argsLength] = data;

                    logger[i].apply(self, argsObj);
                };
            })(i);
        }
    }
    self.alert = function () {
        var args = arguments;
        severeLog.apply(self, args);
    }
};

//Returns data if we can find in the arguments data
//return empty object
function parseUserData(data) {
    var userObj = {};
    _.each(data, function(obj) {
        if(obj && obj.user) {
            var usr = obj.user;
            userObj = {
                userId:             usr.userId,
                userName:           usr.userName,
                firmId:             usr.firmId,
                orionConnectUserId: usr.connectUserId
            };
        }
    });
    return userObj;
}

logger.level = loggingLevel;
module.exports = function (moduleName) {
    return new customLogger(moduleName);
}
