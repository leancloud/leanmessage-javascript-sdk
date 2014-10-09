var WebClient = require('./chat.js');
var appid = '28ferwlg9sncja6qw9ede6ruomjfed7lex4dljhlg80u23xl';
var peerId = 'abc'


createChat('onePeer');
function createChat(peerId,peers){
  var chat =  WebClient({
    appId: appid,
    peerId: peerId,
    peerIds: peers
  });
  chat.open().then(function(data){
    console.log('opened---',data)
  },function(data){
    console.log('open rejected',data)
  });
  chat.open().then(function(data){
    console.log('opened1---',data)
  },function(data){
    console.log('open1 rejected',data)
  });
  // chat.open();
  // chat.open();
  // chat.on('initOnlinePeers',function(peers){
  //   console.log('initOnlinePeers',peers)
  // })
  chat.on('newOnlinePeers',function(peers){
    console.log('newOnlinePeers',peers)
  })
  chat.on('opened',function(data){
    console.log('sessionOpened',data)
    // chat.send("abc1",'s').then(function(msg){
    //   console.log("message sended ",msg)
    // })

    // chat.send("abc2",'s').then(function(msg){
    //   console.log("message sended ",msg)
    // })
    // chat.send("abc3",'s').then(function(msg){
    //   console.log("message sended ",msg)
    // })
  });
}