var WebClient = require('./chat.js').WebClient;
var appid = '28ferwlg9sncja6qw9ede6ruomjfed7lex4dljhlg80u23xl';
var peerId = 'abc'
var chat =  WebClient({
  appId: appid,
  peerId: peerId
});
chat.open();
// chat.open();
// chat.open();
chat.on('opened',function(data){
  console.log('sessionOpened',data)
  chat.send("abc1",'s').then(function(msg){
    console.log("message sended ",msg)
  })

  chat.send("abc2",'s').then(function(msg){
    console.log("message sended ",msg)
  })
  chat.send("abc3",'s').then(function(msg){
    console.log("message sended ",msg)
  })
})