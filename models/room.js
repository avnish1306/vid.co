const mongoose = require('mongoose');
const {getNewId} = require('../utils/utils');
const Schema = mongoose.Schema;
const roomSchema = new Schema({
    meetingId:{
        type:String,
        unique:true
    },
    roomId:{
        type:String,
        unique:true
    },
    createdAt:{
        type:Date,
        default:new Date()
    },
    host:{
        hostId:String,
        hostName:String
    },
    roomKey:{
        type:String
    },
    guests:[{
        guestId:{
            type:String
        },
        guestName:{
            type:String
        },
        status:{
            type:Boolean,
            default:true
        },
        joinedAt:{
            type:Date,
            default:new Date()
        },
        leftAt:{
            type:Date,
            default:null
        },
        isHost:{
            type:Boolean,
            default:false
        }
    }]
});
roomSchema.statics.joinRoom=(meetingId,guestObj)=>{  //gusetObj = {'guestId','guestName'}
    var promise = new Promise((resolve,reject)=>{
        Room.findOne({'meetingId':meetingId},(err,room)=>{
            if(err) return reject(err);
            if(!room) return resolve({status:false,msg:"Room Not found"});
            let guset = room.guests.find(x=>{
                return x.guestId==guestObj.guestId;
            });
            let msg="";
            if(guset){
                let oldGuests = room.guests.filter(x=>{
                    return x.guestId!=guestObj.guestId;
                });
                guset.status=true;
                guset.leftAt=null;
                oldGuests.push(guset);
                room.guests = oldGuests;
                msg ="Guest already in the room, status updated";

            }else{
                room.guests.push(guestObj);
                msg="Guest added";
            } 
            room.save().then(newRomm=>{
                return resolve({status:true,data:newRomm,msg});
            }).catch(e=>{
                return reject(e);
            })
        });
    });
    return promise;
}
roomSchema.statics.leaveRoom=(roomId,guestObj)=>{
    var promise = new Promise((resolve,reject)=>{
        Room.findOne({'roomId':roomId},(err,room)=>{
            if(err) return reject(err);
            if(!room) return resolve({status:false,msg:"Room Not found"});
            let guset = room.guests.find(x=>{
                return x.guestId==guestObj.guestId;
            });
            let msg="";
            if(guset){
                let oldGuests = room.guests.filter(x=>{
                    return x.guestId!=guestObj.guestId;
                });
                guset.status=false;
                guset.leftAt=new Date();
                room.guests.push(guset);
                msg ="Guest leaved";
                room.save().then(newRomm=>{
                    return resolve({status:true,data:newRomm,msg:msg});
                }).catch(e=>{
                    return reject(e);
                })
            }else{
                return resolve({status:false,msg:"Guest was not in this room"});
            } 
        });
    });
    return promise;
};
roomSchema.statics.verifyKey = (meetingId,roomKey)=>{
    var promise = new Promise((resolve,reject)=>{
        Room.findOne({'meetingId':meetingId},(err,room)=>{
            if(err) return reject(err);
            if(!room) return resolve({status:false,msg:"Invalid Meeting Id"});
            if(roomKey==room.roomKey){
                return resolve({status:true,msg:"Successfully Authenticated",data:room.roomId});
            }else{
                return resolve({status:false,msg:"Invalid Room Key"})
            }
        });
    });
    return promise;
}
roomSchema.statics.getGuests=(roomId,status="ANY")=>{
    var promise = new Promise((resolve,reject)=>{
        Room.findOne({'roomId':roomId},(err,room)=>{
            if(err) return reject(err);
            if(!room) return resolve({status:false,msg:"Invalid Room Id"});
            if(status=="ANY"){
                return resolve({status:true,msg:"Guests found",data:room.guests});
            }else{
                var filteredGuest = room.guests.filter(x=>{
                    return x.status==status;
                });
                return resolve({status:true,msg:"Guests found(filtered)",data:filteredGuest})
            }
        });
    });
    return promise;
}

roomSchema.statics.getRoomId=(meetingId)=>{
    var promise = new Promise((resolve,reject)=>{
        Room.findOne({'meetingId':meetingId},(err,room)=>{
            if(err) return reject(err);
            if(!room) return resolve({status:false,msg:"Invalid Meeting Id"});
            
            return resolve({status:true,msg:"Room Id found",data:{roomId:room.roomId,roomKey:room.roomKey}});
        });
    });
    return promise;
};
const Room=module.exports = mongoose.model('Room', roomSchema);