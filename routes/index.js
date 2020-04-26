var express = require('express');
var router = express.Router();
var User = require('../models/user');
var Room = require('../models/room');
const {getNewId,getNewKey,handle200Error,handleError}  = require('../utils/utils')

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
      let userObj = socket.handshake.query.user||null;
      if(userObj){
        authUser(userObj,roomId1).then(isHost=>{
          socket._isAuthenticated=true;
          socket._authError=null;
          socket._guetsId = userObj.userId,
          socket._isHost=isHost;
        }).catch(x=>{
          socket._isAuthenticated=false;
          socket._authError=x;
        })
      }else{
        socket._isAuthenticated=false;
        socket._authError="User obj required";
      }
      return next();
      // // verify token
      // jwt.verify(token, process.env.TOKEN_SECRET, (err, decoded) => {
      //   if(err) return next(err);
      //   // set the user’s mongodb _id to the socket for future use
      //   socket._id = decoded._id;
      //   next();
      // });
     });
    console.log("namespace ",nsp);
    nsp.on('connection', function(socket){
      if(!socket._isAuthenticated){
        socket.emit("authenticate",{status:false,msg:socket._authError})
        socket.disconnect(true);
      }else{
        socket.emit("authenticate",{status:true,msg:"Successfuly authenticated"});
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
        console.log('someone connected ,', socket,'\n\n\n',nsp);
      }

      
    });
    //nsp.emit('hi', 'everyone!');
    return res.status(200).json({
      'status':1,
      'data':{
        'roomId':roomId,
        'roomKey':newRoom.roomKey,
        'host':host,
        'meetingId':newRoom.meetingId
      }
    })

  }).catch(e=>{
      return handleError(res);
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
        var nspSockets = io.of('/chat').sockets;
        var hostSocket = nspSockets.find(x=>{
          return x._isHost==true;
        })
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
    return req.status(500).json({
      'err':"Error in query params"
    });
  }
})


const authUser = (userObj,roomId)=>{
  let promise = new Promise((resolve,reject)=>{
    if(!roomId) return reject("Room id required");
    Room.findOne({'roomId':roomId},(err,room)=>{
      if(err) return reject("internal server error");
      if(!room) return reject("Room not found");
      let user = room.guests.find(x=>{
        return x.guestId=userObj.userId;
      });
      if(!user) return reject("Auth Failed");
      if(user.isHost){
        return resolve(true);
      }else{
        return resolve(false);
      }
    });

    return promise;
  })
}
module.exports = router;

/*




*/
