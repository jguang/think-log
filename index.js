var log4js = require('log4js');
var path = require('path');

var logInit = false;

var rewriteLog = function(think, http) {
    const thinklog = think.log;
    think.log = function(msg, type, showTime) {
        var logsConfig = http.config('logs');
        var recordConsole = logsConfig.recordConsole;
        var isHave = false;
        for (i in recordConsole) {
            if (recordConsole[i] == type) {
                isHave = true;
            }
        }

        var recordMsg = '';
        if (think.isString(msg)) {
            recordMsg = msg;
        } else if (think.isObject(msg) || think.isArray(msg)) {
            recordMsg = JSON.stringify(msg);
        } else {
            recordMsg = 'Function';
        }

        if (isHave) {
            let time = Date.now() - showTime;
            var recordMsg = msg + ' ' + time + 'ms';
            http.addLog('console', recordMsg);
        }
        thinklog(msg, type, showTime);
    };
};

exports.reqStart = function(think) {
    return function(http) {
        if (!logInit) {
            var logsConfig = http.config('logs');
            var modules = think.module;
            var appenders = [];
            var levels = {};
            modules.forEach(function(module) {
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
    };
};

exports.routeParse = function(think) {
    return function(http) {
        var logsConfig = http.config('logs');
        var logger = log4js.getLogger(http.module);
        var loggerWf = log4js.getLogger(http.module + '-wf');
        var format = http.config('logs').format;
        var logObj = {};
        http.loggerId = http.headers.logid || Date.now();
        logObj.logId = http.loggerId;
        logObj.method = http.method;
        logObj.ip = http.ip(true);
        logObj.xRealIp = http.ip();
        logObj.uri = http.url;
        logObj.refer = http.referrer();
        logObj.module = http.module;
        logObj.controller = http.controller;
        logObj.action = http.action;
        logObj.host = http.host;
        logObj.cookie = http.req.headers.cookie;
        logObj.ua = http.req.headers['user-agent'];
        http._loggerAry = [];
        var logStr = function(key, value) {
            var str = [];
            if (think.isObject(key)) {
                // for (var k in key) {
                //     str.push(logStr(k, key[k]));
                // }
                return JSON.stringify(key);
            } else if (think.isArray(key)) {
                //str = str.concat(key);
                // key.forEach(function(value) {
                //     str.push(think.isObject(value) ? '[' + logStr(value) + ']' : logStr(value));
                // });

                return JSON.stringify(key);
            } else if (value !== undefined) {
                str.push(
                    key +
                        '=' +
                        (think.isObject(value)
                            ? '[' + logStr(value) + ']'
                            : logStr(value))
                );
            } else {
                str.push(key);
            }
            return str.join(';');
        };
        http.addLog = function(key, value) {
            try {
                http._loggerAry.push(logStr(key, value));
            } catch (e) {
                console.log(e);
            }
        };
        http.logger = function(type, logInfo) {
            try {
                logObj.time = Date.now() - http.startTime + 'ms';
                if (logInfo === undefined) {
                    logInfo = type;
                    type = 'info';
                }
                logObj.S = logStr(logInfo);
                var log = format.replace(/\%([\w]+)/gi, function(str, $1) {
                    return logObj[$1];
                });
                type = type.toLowerCase();
                if ('warn error fatal'.indexOf(type) < 0) {
                    logger[type] && logger[type](log);
                } else {
                    loggerWf[type] && loggerWf[type](log);
                }
            } catch (e) {
                console.log(e);
            }
        };
        var isRewriteLog = logsConfig.recordConsole;
        if (isRewriteLog) {
            rewriteLog(think, http);
        }
    };
};

exports.responseEnd = function(think) {
    return function(http) {
        http.addLog('RESPONSE_STATUS', http.res.statusCode);
        http.addLog('RESPONSE_END', 'OK');
        http._loggerAry.length && http.logger(http._loggerAry.join('; '));
    };
};
