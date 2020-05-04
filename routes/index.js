var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Room = require('../models/room');
const {getNewId,getNewKey,handle200Error,handleError,getPersonalRoomId}  = require('../utils/utils')

/* GET home page. */
router.post('/createRoom', function(req, res, next) {
  var username = req.body.username;
  var roomId = getNewId(req.body.username);
  var host = {
    'hostName':username,
    'hostId':getNewId()
  }
  var room = new Room({
    'meetingId':getNewId(),
    'roomId':roomId,
    'host':host,
    'guests':[{'guestId':host.hostId,'guestName':host.hostName,'isHost':true}],
    'roomKey':getNewKey(),
  });
  room.save().then(newRoom=>{
    const nsp = io
    .of('/'+roomId)
    .use((socket, next) => {
      let token = socket.handshake.query.token||null;
      let roomId1 = socket.handshake.query.roomId||null;
      let userId1 = socket.handshake.query.userId||null;
      console.log('user object',socket.handshake.query);
      if(userId1){
        authUser(userId1,roomId1).then(authRes=>{
        
          socket._isAuthenticated=true;
          socket._authError=null;
          socket._guestId = userId1,
          socket._isHost=authRes.isHost,
          socket._name = authRes.guestName,
          socket._roomId=roomId1
          console.log("Use If Then me ",socket._isAuthenticated,socket._isHost,socket._authError);
          return next();
        }).catch(x=>{
          socket._isAuthenticated=false;
          socket._authError=x;
          console.log("Use If Catch me ",socket._isAuthenticated,socket._authError);
          return next();
        })
      }else{
        socket._isAuthenticated=false;
        socket._authError="User obj required";
        console.log("Use Else me ",socket._isAuthenticated,socket._authError);
        return next();
      }
      // // verify token
      // jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
      //   if(err) return next(err);
      //   // set the user’s mongodb _id to the socket for future use
      //   socket._id = decoded._id;
      //   next();
      // });
     });
    // console.log("namespace ",nsp);
    nsp.on('connection', function(socket){
      console.warn("ID 11:",socket.id);
    console.log('connection request',);

      if(!socket._isAuthenticated){
        socket.emit("authenticate",{status:false,msg:socket._authError})
        socket.disconnect(true);
      }else{
        Room.getGuests(socket._roomId).then(resp=>{
          if(resp.status){
            joinPersonalRooms(socket._guestId,resp.data,socket);
            socket.emit("authenticate",{status:true,msg:"Successfuly authenticated, Sending user list",guests:resp.data});
          }else{
            socket.emit("authenticate",{status:true,msg:"Successfuly authenticated, Sending user list"+resp.msg,guests:[]});
          }
          
        }).catch(err=>{
          socket.emit("authenticate",{status:true,msg:"Successfuly authenticated, Sending user list"+err,guests:[]});
        })
        
        if(socket._isHost){ //listeners for host
          socket.on('guest-request-response',(response)=>{   //{status:true/false,guestObj:{guestId,guestName},meetingId:""}
            if(response.status){
              Room.joinRoom(response.meetingId,response.guestObj)
              .then(x=>{
                console.log("guest-request-response:  ",x);
              })
              .catch(e=>{
                console.log("guest-request-response:  ",e);
              })
            }
          })
        }
        socket.on('join-personal-room',(response)=>{
          let {ownId,userId} = response;
          let roomId = getPersonalRoomId(ownId,userId);
          socket.join(roomId);
        });
        socket.on('personal-message',(msgObj)=>{ //{type=0:"msg",type=1:"Action",type=3:"typing"}  {type,to,from,msg}
          let {to,from} = msgObj;
          let personalRoomId = getPersonalRoomId(to,from);

          socket.broadcast.to(personalRoomId).emit('personal-message-reply', msgObj);
        })
        nsp.emit('new-user-added',{
          'userId':socket._guestId,
          'name':socket._name,


        });
        nsp.on("group-message",(msgObj)=>{ //{type=0:"msg",type=1:"Action",type=3:"typing"}
          nsp.emit('group-message-reply',msgObj);
        })
        console.log('someone connected ');
      }

      
    });
    //nsp.emit('hi', 'everyone!');
    res.status(200).json({
      'status':1,
      'data':{
        'roomId':roomId,
        'roomKey':newRoom.roomKey,
        'host':host,
        'meetingId':newRoom.meetingId
      }
    })

  }).catch(e=>{
      handleError(res);
  })
});

router.post('/joinRoom',(req,res,next)=>{
  var meetingId = req.body.meetingId;
  var guestName = req.body.username;
  var roomKey = req.body.roomKey||null;
  Room.getRoomId(meetingId).then((result)=>{
    if(result.status){
      var roomId = result.data.roomId;
      var guestObj={
        'guestId':getNewId(),
        'guestName':guestName
      }
      if(roomKey){
        if(roomKey==result.data.roomKey){
          Room.joinRoom(meetingId,guestObj)
          .then(result1=>{
            if(result1.status){
              return res.status(200).json({
                'status':1,
                'data':{
                  'guestObj':guestObj,
                  'roomId':roomId

                }
              });
            }else{
              return handle200Error(res,result1.msg);
            }
          })
          .catch(e=>{
              return handleError(res);
          })
          
        }else{
          return handle200Error(res,"Invalid Room Key");
        }
      }else{
        const nsp = io.of('/'+roomId);
        var nspSockets = Object.keys(nsp.connected);
        // console.warn("NSG 0",nsp.connected[Object.keys(nsp.connected)[0]]);//.sockets.sockets);
        // console.warn("KEYS 0",Object.keys(nsp.connected[Object.keys(nsp.connected)[0]]));//.sockets.sockets));
        var hostSocket = nspSockets.find(x=>{
          return nsp.connected[x]._isHost == true;
        })
        console.log("HOST SOCKET",hostSocket);
        hostSocket = nsp.connected[hostSocket];
        hostSocket.emit('guest-request',guestObj);
        return res.status(200).json({
          'status':0,
          'data':{
            'guestObj':guestObj,
            'meetingId':meetingId

          }
        });
      }

    }else{
      return handle200Error(res,result.msg);
    }

  }).catch(e=>{
    console.log(e)
    return handleError(res);
  });
});

router.get('/checkReqStatus',(req,res,next)=>{
  var guestId = req.query.guestId||null;
  var meetingId=req.query.meetingId||null;
  if(guestId&&meetingId){
      Room.findOne({'meetingId':meetingId},(err,room)=>{
        if(err) return handleError(res);
        if(!room) return handle200Error(res,"Room not found");
        var guest = room.guests.find(x=>{
          return x.guestId==guestId;
        });
        if(guest){
          return res.status(200).json({
            'status':1,
            'guestObj':{'guestId':guest.guestId,'guestName':guest.guestName},
            'roomId':room.roomId
          })
        }else{
          return handle200Error(res,"Not Accepted");
        }
      })
  }else{
    return res.status(500).json({
      'err':"Error in query params"
    });
  }
})

const joinPersonalRooms = (ownId,guests,socket)=>{
  guests.forEach(guest => {
    let userId = guest.guestId;
    if(userId!=ownId){
      let roomId = getPersonalRoomId(ownId,userId);
      socket.join(roomId);
    }
  });
}
const authUser = (userId,roomId)=>{
  console.log("USER >>>",userId);
  return new Promise((resolve,reject)=>{
    if(!roomId) return reject("Room id required");
    Room.findOne({'roomId':roomId},(err,room)=>{
      if(err) return reject("internal server error");
      if(!room) return reject("Room not found");
      console.log("ROOM >>>",room);
      let user = room.guests.find(x=>{
        console.log("SALT",x, userId)
        return x.guestId==userId;
      });
      if(!user) return reject("Auth Failed");
      if(user.isHost){
        return resolve({'userObj':user,'isHost':true,'guestName':user.guestName});
      }else{
        return resolve({'userObj':user,'isHost':false,'guestName':user.guestName});
      }
    });
  })
}

router.get('/roomGuests',(req,res)=>{
    Room.findOne({'roomId':req.query.roomId || ""},(err,room)=>{
      if(err) return handleError(res);
      if(!room) return handle200Error(res,"Room not found");
      return res.status(200).json({
        status: 1,
        roomGuests: room.guests
      })
    });
});
module.exports = router;

/*




*/
