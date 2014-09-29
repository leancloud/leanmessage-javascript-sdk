// var klass = require('klass');
// var ajax = require('ajax');
XMLHttpRequest = typeof XMLHttpRequest === 'undefined' ? require("xmlhttprequest").XMLHttpRequest : XMLHttpRequest;
var WebSocket = require('ws');
var Promise = require('es6-promise').Promise;
var EventEmitter = require('events').EventEmitter;
module.exports = AVChatClient;

function AVChatClient(settings) {
  if (this instanceof AVChatClient == false) {
    return new AVChatClient(settings)
  }
  var _emitter, _settings, _waitCommands, server, ws, keepAliveTimeout;
  var cmdMap = {
    'direct': 'ack',
    'sessionopen': 'sessionopened',
    'sessionadd': 'sessionadded',
    'sessionquery': 'sessionquery-result',
    'roomjoin': 'roomjoined',
    'roominvite': 'roominvited',
    'roomleave': 'roomleft',
    'roomkick': 'roomkicked'
  }

  var timers = [];
  function auth(peerId, watchingPeerIds){
    return Promise.resolve({
      watchingPeerIds: watchingPeerIds||[]
    });
  }
  function groupAuth(peerId, groupId, action, groupPeerIds){
    return Promise.resolve({
      groupPeerIds: groupPeerIds || []
    });
  }
  function initialize(settings) {
    if (!settings) throw new Error('settings')
    if (!settings.appId) throw new Error('settings.appId')
    if (!settings.peerId) throw new Error('settings.peerId')
    if (settings.auth && typeof settings.auth != 'function'){
      throw new Error('sesstings.auth')
    }
    if (settings.groupAuth && typeof settings.groupAuth != 'function'){
      throw new Error('sesstings.groupAuth')
    }
    _settings = settings || {};
    _settings.auth = settings.auth || auth;
    _settings.groupAuth = settings.groupAuth || groupAuth;
    _settings.watchingPeerIds = settings.watchingPeerIds || [];
    _waitCommands = [];
    _emitter = new EventEmitter();
    keepAliveTimeout = 60000;
    // if(keepAliveTimeout > 60000){
    //   keepAliveTimeout = 60000;
    // }
    // watchingPeer = [].concat(settings.watchingPeer);
  }

  initialize(settings);

  function _getServerInfo(appId, secure) {
    var  protocol = "http://";
    if(typeof window !='undefined' && window.location&&window.location.protocol == 'https:'){
      protocol = "https://";
    }
    var url = protocol+'router-g0-push.avoscloud.com/v1/route?appId=' + appId ;
    if(secure){
      url+='&secure=1';
    }
    return get(url);
  }

  function _connect() {
    if (server && new Date() < server.expires) {
      return new Promise(function(resolve, reject) {
        ws = new WebSocket(server.server);
        _timeout('connectopen',function(){ reject();});
        ws.onopen = function() {
          if(timers.length > 0){
            clearTimeout(timers.shift()[1]);
          }
          resolve(server);
        };
        ws.onclose = function() {
          doClose();
          _emitter.emit('close');
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
              _emitter.emit('online', data.onlineSessionPeerIds);
            }
          } else if (data.cmd == 'presence') {
            if (data.status == 'on') {
              _emitter.emit('online', data.sessionPeerIds);
            } else if (data.status == 'off') {
              _emitter.emit('offline', data.sessionPeerIds);
            }
          } else if (data.cmd == 'direct') {
            _emitter.emit('message', data);
            var msg = {
              "cmd": "ack",
              "peerId": _settings.peerId,
              "appId": _settings.appId,
              'ids': [].concat(data.id)
            }
            var s = JSON.stringify(msg)
            ws.send(s);
          } else if(data.cmd == 'room'){
            if(data.op == 'members-joined'){
              _emitter.emit('membersJoined', data);
            }else if(data.op == 'members-left'){
              _emitter.emit('membersLeft', data);
            }else if(data.op == 'joined'){
              _emitter.emit('joined',data)
            }else if(data.op == 'left'){
              _emitter.emit('left',data);
            }
          }
        };
      });
    } else {
      return _getServerInfo(_settings.appId,_settings.secure).then(function(result) {
        server = result;
        server.expires = Date.now() + server.ttl * 1000;
        return _connect();
      });
    }
  }

  function _openSession() {
    return _settings.auth(_settings.peerId,_settings.watchingPeerIds).then(function(data){
      _settings.watchingPeerIds = data.watchingPeerIds;
      return doCommand('session','open',{
        sessionPeerIds: data.watchingPeerIds,
        s: data.s,
        t: data.t,
        n: data.n

      });
    })

  }


  function _timeout(name,reject){
    timers.push([name,setTimeout(function(){
      if(reject){
        reject(name+'timeout');
      }
      doClose();
      // _emitter.emit('close');
      // if(name == '{}'){
      //   doClose();
      //   _emitter.emit('close');
      // }
    },10000)]);
  }

  function _keepAlive(){
    clearTimeout(_keepAlive.handle);
    _keepAlive.handle = setTimeout(function(){
      if(ws.readyState == 1){
        ws.send('{}');
        _timeout('{}');
        _keepAlive();
      }
    },keepAliveTimeout);
  }

  function doClose(){
    ws.close();
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
    //send
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
    if(!ws){
      return Promise.reject();
    }
    if(ws.readyState != 1){
      return Promise.reject(ws.readyState);
    }
    ws.send(JSON.stringify(msg));
    //wait
    var c = typeof op == 'undefined'?cmd : cmd+op;
    if((cmd == 'direct' && props.transient == true) || ['sessionremove','sessionclose'].indexOf(c) > -1 ){
      return Promise.resolve();
    }else{
      return new Promise(function(resolve, reject) {

        _waitCommands.push([cmdMap[c]||c, resolve, reject]);
        _timeout(cmdMap[c]||c ,reject);
      });
    }
  }

  this.open = function() {
    // console.log(ws.readyState)
    if(ws && ws.readyState == 0 ){
      return Promise.reject(0);
    }
    if(ws && ws.readyState == 1) {
      return Promise.resolve();
    }
    timers.forEach(function(v,i){
      clearTimeout(v[1]);
    });
    timers = [];
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
    var obj = {
      'msg': msg,
      'toPeerIds': [].concat(to)
    }
    if(typeof transient != 'undefined' && transient == true){
      obj.transient = transient;
    }
    return doCommand('direct',undefined,obj);
  };

  this.on = function(name, func) {
    _emitter.on(name, func)
  };
  this.watch = function(peers) {
    return _settings.auth(_settings.peerId,[].concat(peers)).then(function(data){
      var watch = [].concat(data.watchingPeerIds);
      watch.forEach(function(v,k){
        if(_settings.watchingPeerIds.indexOf(v)==-1){
          _settings.watchingPeerIds.push(v);
        }
      });
      return doCommand('session', 'add', {
        'sessionPeerIds': [].concat(data.watchingPeerIds),
        s: data.s,
        t: data.t,
        n: data.n
      });
    })
  }
  this.unwatch = function(peers) {
    peers.forEach(function(v,k){
      if(_settings.watchingPeerIds.indexOf(v)>-1){
        _settings.watchingPeerIds.splice(_settings.watchingPeerIds.indexOf(v),1);
      }
    });
    return doCommand('session', 'remove', {
      "sessionPeerIds": [].concat(peers)
    });
  }
  this.getStatus = function(peers) {
    return doCommand('session', 'query' ,{
      'sessionPeerIds': [].concat(peers)
    });
  }
  this.joinGroup = function(groupId) {
    return _settings.groupAuth(_settings.peerId,groupId,'join','').then(function(data){
      return doCommand('room', 'join', {
        roomId: groupId
      });
    });
  }
  this.sendToGroup = function(msg, groupId, transient){
    var obj = {
      'msg': msg,
      'roomId': groupId
    }
    if(typeof transient != 'undefined' && transient == true){
      obj.transient = transient;
    }
    return doCommand('direct',undefined,obj);
  }
  this.inviteToGroup= function(groupId, groupPeerIds){
    return _settings.groupAuth(_settings.peerId,groupId,'invite',groupPeerIds).then(function(data){
      return doCommand('room', 'invite', {
        roomId: groupId,
        roomPeerIds: [].concat(data.groupPeerIds)
      });
    });
  }
  this.kickFromGroup= function(groupId, groupPeerIds) {
    return _settings.groupAuth(_settings.peerId,groupId,'kick',groupPeerIds).then(function(data){
      return doCommand('room', 'kick', {
        roomId: groupId,
        roomPeerIds: [].concat(groupPeerIds)
      });
    });
  }
  this.leaveGroup = function(groupId) {
    return doCommand('room', 'leave', {
      roomId: groupId
    });
  }


};


function get(url) {
  if (typeof jQuery !== 'undefined') {
    return Promise.resolve(jQuery.getJSON.call(jQuery, url+='&cb=?'));
  }else{
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
          resolve(JSON.parse(req.responseText));
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

}
