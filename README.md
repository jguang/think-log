# think-logger
log4js middleware for thinkjs


# Getting start

npm install think-log

# 在 think.js 2.x 中使用

编辑 config/hook.js 增加三个 hook

```
export default {
    request_begin: ['prepend', 'reqstart'],
    route_parse: ['append', 'routestart'],
    response_end: ['append', 'resend']
}
```

register middleware在src/common/bootstrap/middleware.js 文件中


```
import log from 'think-log';

think.middleware('reqstart', log.reqStart(think));

think.middleware('routestart', log.routeParse(think));

think.middleware('resend', log.responseEnd(think));

````

增加配置在src/common/config/config.js文件中

```
export default {
    logs: {
        level: 'TRACE', // TRACE  DEBUG INFO WARN ERROR FATAL
        path: think.ROOT_PATH + '/logs/',
        format: 'logId[%logId] ip[%ip] time[%time] method[%method] host[%host]' +
        'uri[%uri] refer[%refer] - [%S] - module[%module] controller[%controller] action[%action] ua[%ua]'
    }
};

```