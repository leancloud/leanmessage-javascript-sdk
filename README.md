
##  方法
### open()
打开链接，需要先 new
### close()
关闭链接
### send(msg, to, transient)
 发送私聊消息
 参数：msg:消息内容, to:发送目标 PeerId, transient（非必须):为true时代表无需离线，默认为支持离线发送。
### watch(peers)
参数：peers:单个peerId 或数组。
### unwatch(peers)
参数：peers:单个peerId 或数组。
### getStatus(peers)
查询 peer 在线或离线状态。适应于非 watch 情况下。
参数：peers:单个peerId 或数组。

##  事件
### close
 链接关闭
### online watcher
上线
### offline watcher
下线
### message
收到消息

## 群组方法
### joinGroup(groupId)
创建或加入群组
groupId: 群组Id,创建时无需传递。
### sendToGroup(msg, groupId, transient)
发送消息到指定群组
msg:消息内容,grouipId:群组ID, transient（非必须):为true时代表无需离线，默认为支持离线发送。
### inviteToGroup(groupId, groupPeerIds)
邀请加入群组
groupId:群组ID,groupPeerIds:单个或数组群组ID
### kickFromGroup(groupId, groupPeerIds)
踢出群组
groupId:群组ID,groupPeerIds:单个或数组群组ID
### leaveGroup(groupId)
离开群组
groupId:群组ID

## 群组事件
### membersJoined
有成员加入群
### membersLeft
有成员离开群
### joined
自己加入了群
### left
自己离开了群


