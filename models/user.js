const mongoose = require('mongoose')
const Schema=mongoose.Schema;
const userSchema =new Schema({
    name: {
        type: String
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    displayPic:{
        type:String,
        default:""
    },
    password:{
        type:String,
        required:true
    },
    friends:[]
    
},{timestamps:true});

// userSchema.statics.setLang=(num,lang)=>{
//     return User.findOneAndUpdate({number:num},{ $set: { lang: lang } },{new:true})
// }
// userSchema.statics.setLastServedMenuName=(num,menuName)=>{
//     return User.findOneAndUpdate({number:num},{ $set: { lastServedMenuName: menuName } })
// }
// userSchema.statics.all=()=>{
//     return User.find()
// }
// userSchema.statics.allSorted=()=>{
//     return User.find().sort( { createdAt: -1 } )
// }
const User=module.exports = mongoose.model('User', userSchema);