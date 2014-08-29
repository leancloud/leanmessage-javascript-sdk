var WebClient = require('./chat.js').WebClient;
var appid = '28ferwlg9sncja6qw9ede6ruomjfed7lex4dljhlg80u23xl';
var peerId = 'abc'


var arr = ['a' ,'b' ]
arr.forEach(function(peer,index){
  var t = arr.slice(0);
  t.splice(index,1);
  console.log('peerIds ',t)
  createChat(peer,t);
})
function createChat(peerId,peers){
  var chat =  WebClient({
    appId: appid,
    peerId: peerId,
    peerIds: peers
  });
  chat.open();
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