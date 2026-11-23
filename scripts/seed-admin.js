require("dotenv").config();
const bcrypt=require("bcryptjs");
const {connectDatabase,mongoose}=require("../backend/config/db");
const User=require("../backend/models/User");
async function seed(){
 const {ADMIN_NAME:name,ADMIN_EMAIL:rawEmail,ADMIN_PASSWORD:password}=process.env;
 if(!name||!rawEmail||!password)throw new Error("Set ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD in the environment before running this command.");
 if(password.length<12||password.length>72)throw new Error("ADMIN_PASSWORD must be 12 to 72 characters.");
 await connectDatabase();const email=rawEmail.trim().toLowerCase();
 if(await User.exists({email}))throw new Error("That email is already registered. This command never elevates existing accounts.");
 await User.create({name,email,phone:process.env.ADMIN_PHONE||"+10000000000",passwordHash:await bcrypt.hash(password,12),role:"admin",emailVerified:true});
 console.log("Admin account created.");
}
seed().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>mongoose.disconnect());