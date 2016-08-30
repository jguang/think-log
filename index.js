var log4js = require('log4js');
var path = require('path');


var logInit = false;

exports.reqStart = function(think) {
    return function(http) {
        if (!logInit) {
            var logsConfig = http.config('logs');
            var modules = think.module;
            var appenders = [];
            var levels = {};
            modules.forEach(function (module) {
                var paths = path.join(logsConfig.path, module, path.sep);
                think.mkdir(paths);
                // 普通日志
                appenders.push({
                    type: 'dateFile',
                    filename: paths + module + '-log',
                    pattern: '.yyyyMMddhh',
                    absolute: true,
                    alwaysIncludePattern: true,
                    category: module
                });

                // 警告日志
                appenders.push({
                    type: 'dateFile',
                    filename: paths + module + '-log.wf',
                    pattern: '.yyyyMMddhh',
                    absolute: true,
                    alwaysIncludePattern: true,
                    category: module + '-wf'
                });

                levels[module] = logsConfig.level;
                levels[module + 'wf'] = logsConfig.level;
            });
            log4js.configure({
                appenders: appenders,
                levels: levels
            });
            logInit = true;
        }
    }
};

exports.routeParse = function(think) {
    return function(http) {
        var logger = log4js.getLogger(http.module);
        var loggerWf = log4js.getLogger(http.module + '-wf');
        var format = http.config('logs').format;
        var logObj = {};
        http.loggerId = http.headers.logid || Date.now();
        logObj.logId = http.loggerId;
        logObj.method = http.method;
        logObj.ip = http.ip();
        logObj.uri = http.url;
        logObj.refer = http.referrer();
        logObj.module = http.module;
        logObj.controller = http.controller;
        logObj.action = http.action;
        logObj.host = http.host;
        logObj.cookie = http.req.headers.cookie;
        logObj.ua = http.req.headers['user-agent'];
        http._loggerAry = [];
        var logStr = function (key, value) {
            var str = [];
            if (think.isObject(key)) {
                for (var k in key) {
                    str.push(logStr(k, key[k]));
                }
            }
            else if (think.isArray(key)) {
                str = str.concat(key);
            }
            else if (value !== undefined) {
                str.push(key + '=' + (think.isObject(value) ? '[' + logStr(value) + ']' : value));
            }
            else {
                str.push(key);
            }
            return str.join('; ');
        };
        http.addLog = function (key, value) {
            http._loggerAry.push(logStr(key, value));
        };
        http.logger = function (type, logInfo) {
            logObj.time = Date.now() - http.startTime + 'ms';
            if (logInfo === undefined) {
                logInfo = type;
                type = 'info';
            }
            logObj.S = logStr(logInfo);
            var log = format.replace(/\%([\w]+)/gi, function (str, $1) {
                return logObj[$1];
            });
            if ('warn error fatal'.indexOf(type) < 0) {
                logger[type] && logger[type](log);
            }
            else {
                loggerWf[type] && loggerWf[type](log);
            }

        };
    }
};

exports.responseEnd = function(think) {
    return function(http) {
        http.addLog("RESPONSE_END", "OK");
        http._loggerAry.length && http.logger(http._loggerAry);
    }
};
