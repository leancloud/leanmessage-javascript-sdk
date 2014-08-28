var WebClient = require('./chat.js').WebClient;
var appid = '28ferwlg9sncja6qw9ede6ruomjfed7lex4dljhlg80u23xl';
var peerId = 'abc'
var chat = new WebClient({
  appId: appid,
  peerId: peerId
});
chat.on('sessionOpened',function(data){
  console.log('sessionOpened')
  console.log(data);
} )