// var klass = require('klass');
// var ajax = require('ajax');
XMLHttpRequest = typeof XMLHttpRequest === 'undefined' ? require("xmlhttprequest").XMLHttpRequest : XMLHttpRequest;
var WebSocket = require('ws');
var Promise = require('es6-promise').Promise;
var EventEmitter = require('events').EventEmitter;
module.exports = WebClient;

function WebClient(settings) {
  if (this instanceof WebClient == false) {
    return new WebClient(settings)
  }
  var _emitter, connectionStatus, _settings, _waitCommands, watchingPeer, server, ws, keepAliveTimeout;
  var cmdMap = {
    'direct': 'ack',
    'sessionopen': 'sessionopened',
    'sessionadd': 'sessionadded',
    'sessionquery': 'sessionquery-result'
  }

  var timers = [];
  function auth(){
    return Promise.resolve();
  }
  function initialize(settings) {
    if (!settings) throw new Error('settings')
    if (!settings.appId) throw new Error('settings.appId')
    if (!settings.peerId) throw new Error('settings.peerId')
    if (settings.auth && typeof settings.auth != 'function'){
      throw new Error('sesstings.auth')
    }
    if(!settings.auth){
      settings.auth = auth;
    }
    _settings = settings || {};
    _waitCommands = [];
    _emitter = new EventEmitter();
    keepAliveTimeout = settings.keepAlive  || 10000;
    if(keepAliveTimeout > 10000){
      keepAliveTimeout = 10000;
    }
    watchingPeer = [].concat(settings.watchingPeer);
    connectionStatus = "notconnected";
  }

  initialize(settings);

  function _getServerInfo(appId) {
    var url = 'http://router.g0.push.avoscloud.com/v1/route?appId=' + appId ;
    return get(url);
  }

  function _connect() {
    if (server && new Date() < server.expires) {
      return new Promise(function(resolve, reject) {
        ws = new WebSocket(server.server);
        _timeout('connectopen',function(){ connectionStatus = 'openfailure'; reject();});
        ws.onopen = function() {
          if(timers.length > 0){
            clearTimeout(timers.shift()[1]);
          }
          connectionStatus = 'connected';
          resolve(server);
        };
        ws.onclose = function() {
          // connectionStatus = 'closed';
          // if (_waitCommands.length > 0 && _waitCommands[0][0] === 'close') {
          //   _waitCommands.shift()[1]();
          // }
        }
        ws.onmessage = function(message) {
          var data = JSON.parse(message.data);

          var cmd = data.op ? data.cmd + data.op : data.cmd;
          if(!cmd){
            cmd = '{}';
          }
          if (_waitCommands.length > 0 && _waitCommands[0][0] === cmd) {
            _waitCommands.shift()[1](data);
          }
          if(timers.length>0 && timers[0][0] == cmd){
            clearTimeout(timers.shift()[1]);
          }

          if (data.cmd == 'session') {
            if (data.op == 'opened'||data.op == 'added') {
              _emitter.emit('onlinePeers', data.onlineSessionPeerIds);
            }
          } else if (data.cmd == 'presence') {
            if (data.status == 'on') {
              _emitter.emit('online', data.sessionPeerIds);
            } else if (data.status == 'off') {
              _emitter.emit('offline', data.sessionPeerIds);
            }
          } else if (data.cmd == 'direct') {
            _emitter.emit('message', {
              msg: data.msg,
              fromPeerId: data.fromPeerId
            });
            var msg = {
              "cmd": "ack",
              "peerId": _settings.peerId,
              "appId": _settings.appId,
              'ids': [].concat(data.id)
            }
            var s = JSON.stringify(msg)
            ws.send(s);
          }
        };
      });
    } else {
      return _getServerInfo(_settings.appId).then(function(result) {
        server = JSON.parse(result);
        server.expires = Date.now() + server.ttl * 1000;
        return _connect();
      });
    }
  }

  function _openSession() {
    return _settings.auth(_settings.peerId,watchingPeer).then(function(data){
      watchingPeer = data.watchingPeer;
      return doCommand('session','open',{
        sessionPeerIds: data.watchingPeer,
        s: data.s,
        t: data.t,
        n: data.n

      });
    })

  }


  function _timeout(name,reject){
    timers.push([name,setTimeout(function(){
      if(reject){
        reject();
      }
      if(name != 'connectopen'){
        doClose();
        _emitter.emit('close');
      }
    },10000)]);
  }

  function _keepAlive(){
    clearTimeout(_keepAlive.handle);
    _keepAlive.handle = setTimeout(function(){
      ws.send('{}');
      _timeout('{}');
      _keepAlive();
    },keepAliveTimeout);
  }

  function doClose(){
    ws.close();
    connectionStatus = 'notconnected';
    clearTimeout(_keepAlive.handle);
    timers.forEach(function(v,i){
      clearTimeout(v[1]);
    });
    _waitCommands.forEach(function(v){
      v[2]();
    });
    timers = [];
    _waitCommands = [];

  }

  function doCommand(cmd, op, props){
    return new Promise(function(resolve, reject) {
      var c = typeof op == 'undefined'?cmd : cmd+op;

      _keepAlive();
      var msg = {
        "cmd": cmd,
        "peerId": _settings.peerId,
        "appId": _settings.appId
      }
      if(op){
        msg.op = op;
      }
      if(props){
        for(k in props){
          msg[k] = props[k];
        }
      }
      ws.send(JSON.stringify(msg));
      if(c != 'sessionremove' && c != 'sessionclose'){ //don't need server confirm
        _waitCommands.push([cmdMap[c]||c, resolve, reject]);
        _timeout(cmdMap[c]||c ,reject);
      }

    });
  }

  this.open = function() {
    if (connectionStatus == 'connecting') {
      return Promise.reject('should not call open again while  already call open method');
    } else if (connectionStatus == 'connected') {
      return Promise.resolve();
    }
    timers.forEach(function(v,i){
      clearTimeout(v[1]);
    });
    timers = [];
    connectionStatus = 'connecting';
    return _connect().then(function() {
      return _openSession();
    });
  };
  this.close = function() {
    doCommand('session', 'close')
    doClose();
    return Promise.resolve();
    // return then;
  }
  this.send = function(msg, to, transient) {
    if (connectionStatus != 'connected') {
      return Promise.reject('can not send msg while not connected');
    }
    var obj = {
      'msg': msg,
      'toPeerIds': [].concat(to)
    }
    if(typeof transient == 'undefined'){
      obj.transient = transient;
    }
    return doCommand('direct',undefined,obj);
  };

  this.on = function(name, func) {
    _emitter.on(name, func)
  };
  this.watch = function(watchingPeer) {

    if(connectionStatus!='connected'){
      return Promise.reject('can not add watchingPeer while not connected');
    }
    return _settings.auth(_settings.peerId,[].concat(watchingPeer)).then(function(data){
      watchingPeer.concat(data.watchingPeer);
      return doCommand('session', 'add', {
        'sessionPeerIds': [].concat(data.watchingPeer),
        s: data.s,
        t: data.t,
        n: data.n
      });
    })
  }
  this.unwatch = function(watchingPeer) {
    if(connectionStatus!='connected'){
      return Promise.reject('can not add watchingPeer while not connected');
    }
    doCommand('session', 'remove', {
      "sessionPeerIds": [].concat(watchingPeer)
    })
    return Promise.resolve();
  }
  this.getStatus = function(watchingPeer) {
    if(connectionStatus!='connected'){
     return  Promise.reject('can not add watchingPeer while not connected');
    }
    return doCommand('session', 'query' ,{
      'sessionPeerIds': [].concat(watchingPeer)
    });
  }


};



function get(url) {
  // Return a new promise.
  return new Promise(function(resolve, reject) {
    // Do the usual XHR stuff
    var req = new XMLHttpRequest();
    req.open('GET', url);
    // req.withCredentials = false;
    req.onload = function() {
      // This is called even on 404 etc
      // so check the status
      if (req.status == 200) {
        // Resolve the promise with the response text
        resolve(req.responseText);
      } else {
        // Otherwise reject with the status text
        // which will hopefully be a meaningful error
        reject(Error(req.statusText));
      }
    };
    // Handle network errors
    req.onerror = function() {
      reject(Error("Network Error"));
    };

    // Make the request
    req.send();
  });
}
