const bcrypt=require("bcryptjs");
const crypto=require("crypto");
const {emailReady,sendEmail}=require("../utils/email");
const User=require("../models/User");
const BrokerProfile=require("../models/BrokerProfile");
const {string,email,phone}=require("../utils/validation");
const {sign,digest,randomToken}=require("../utils/tokens");
const cookieOptions=()=>({httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*1000});
function setLoginCookie(res,user){res.cookie("nestora_auth",sign(user),cookieOptions());}
function clearLoginCookie(res){res.clearCookie("nestora_auth",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/"});}
function safeUser(user){return {id:user._id.toString(),name:user.name,email:user.email,phone:user.phone,role:user.role,suspended:user.suspended,emailVerified:user.emailVerified,profileImage:user.profileImage,sellerDetails:user.role==="seller"?user.sellerDetails||{sellerType:"individual",organizationName:""}:undefined,createdAt:user.createdAt};}
async function deliverVerificationEmail(to,token){
  if(!emailReady()){if(process.env.NODE_ENV!=="production")return false;throw Object.assign(new Error("Email verification is not configured"),{status:503});}
  const link=`${process.env.APP_URL||process.env.FRONTEND_URL||"http://localhost:5000"}/account.html?verificationToken=${encodeURIComponent(token)}`;
  return sendEmail({to,subject:"Verify your NESTORA email",text:`Use this link within 24 hours to verify your email: ${link}`});
}
async function register(req,res){
  const role=string(req.body.role,"role",4,12).toLowerCase();if(!["buyer","broker","seller"].includes(role))return res.status(400).json({success:false,message:"Public registration supports buyers, brokers, and sellers only"});
  const name=string(req.body.name,"Name",2,100),mail=email(req.body.email),mobile=phone(req.body.phone),password=string(req.body.password,"Password",10,72);
  if(Buffer.byteLength(password,"utf8")>72)return res.status(400).json({success:false,message:"Password may not exceed 72 UTF-8 bytes"});
  if(!/[a-z]/.test(password)||!/[A-Z]/.test(password)||!/[0-9]/.test(password))return res.status(400).json({success:false,message:"Password must include upper and lower case letters and a number"});
  if(req.body.confirmPassword!==undefined&&password!==req.body.confirmPassword)return res.status(400).json({success:false,message:"Passwords do not match"});
  let sellerDetails;
  if(role==="seller"){
    const sellerType=string(req.body.sellerType||"individual","Seller type",4,20).toLowerCase();
    if(!["individual","company"].includes(sellerType))return res.status(400).json({success:false,message:"Seller type must be individual or company"});
    const organizationName=string(req.body.organizationName||"","Organization name",sellerType==="company"?2:0,120);
    if(sellerType==="company"&&!organizationName)return res.status(400).json({success:false,message:"Organization name is required for company sellers"});
    sellerDetails={sellerType,organizationName};
  }
  if(process.env.NODE_ENV==="production"&&!emailReady())return res.status(503).json({success:false,message:"Email verification is not configured. Set Resend or SMTP before accepting new accounts."});
  const verificationToken=randomToken();
  const user=await User.create({name,email:mail,phone:mobile,passwordHash:await bcrypt.hash(password,12),role,emailVerificationTokenHash:digest(verificationToken),emailVerificationTokenExpires:new Date(Date.now()+24*60*60*1000),...(sellerDetails?{sellerDetails}:{})});
  let verificationSent=false;
  try {
    if(role==="broker"){
      const areas=Array.isArray(req.body.areasServed)?req.body.areasServed:typeof req.body.areasServed==="string"?req.body.areasServed.split(",").map(x=>x.trim()).filter(Boolean):[];
      await BrokerProfile.create({user:user._id,agencyName:string(req.body.agencyName||"","Agency name",0,100),experience:Number(req.body.experience||0),licenseNumber:string(req.body.licenseNumber||"","License number",0,100),bio:string(req.body.bio||req.body.description||"","Bio",0,2000),areasServed:areas});
    }
    verificationSent=await deliverVerificationEmail(mail,verificationToken);
  } catch(err) {
    await Promise.all([User.deleteOne({_id:user._id}),BrokerProfile.deleteOne({user:user._id})]);
    throw err;
  }
  setLoginCookie(res,user);const result={success:true,message:"Account created successfully. Verify your email to complete setup.",user:safeUser(user),verificationSent};if(!verificationSent&&process.env.NODE_ENV!=="production")result.developmentVerificationToken=verificationToken;res.status(201).json(result);
}
async function login(req,res){
  const mail=email(req.body.email);const password=string(req.body.password,"Password",1,72);const user=await User.findOne({email:mail}).select("+passwordHash");
  if(!user||user.suspended||!(await bcrypt.compare(password,user.passwordHash))||(req.body.role&&req.body.role!==user.role))return res.status(401).json({success:false,message:"Email or password is incorrect"});
  setLoginCookie(res,user);res.json({success:true,message:"Signed in",user:safeUser(user)});
}
async function logout(req,res){req.user.tokenVersion+=1;await req.user.save();clearLoginCookie(res);res.clearCookie("nestora_csrf",{path:"/"});res.json({success:true,message:"Signed out"});}
async function me(req,res){res.json({success:true,user:safeUser(req.user)});}
async function verifyEmail(req,res){const token=string(req.body.token,"Verification token",32,200);const user=await User.findOne({emailVerificationTokenHash:digest(token),emailVerificationTokenExpires:{$gt:new Date()}}).select("+emailVerificationTokenHash +emailVerificationTokenExpires");if(!user)return res.status(400).json({success:false,message:"Verification token is invalid or has expired"});user.emailVerified=true;user.emailVerificationTokenHash=undefined;user.emailVerificationTokenExpires=undefined;await user.save();res.json({success:true,message:"Email verified",user:safeUser(user)});}
async function updateProfile(req,res){
  if(req.body.role!==undefined)return res.status(400).json({success:false,message:"Role changes are managed by an administrator"});
  if(req.body.name!==undefined)req.user.name=string(req.body.name,"Name",2,100);if(req.body.phone!==undefined)req.user.phone=phone(req.body.phone);if(req.body.profileImage!==undefined)req.user.profileImage=string(req.body.profileImage,"Profile image",0,2048);
  if(req.user.role==="seller"&&req.body.sellerDetails!==undefined){const detail=req.body.sellerDetails||{};const sellerType=string(detail.sellerType||"individual","Seller type",4,20).toLowerCase();if(!["individual","company"].includes(sellerType))return res.status(400).json({success:false,message:"Seller type must be individual or company"});const organizationName=string(detail.organizationName||"","Organization name",sellerType==="company"?2:0,120);if(sellerType==="company"&&!organizationName)return res.status(400).json({success:false,message:"Organization name is required for company sellers"});req.user.sellerDetails={sellerType,organizationName};}
  await req.user.save();res.json({success:true,message:"Profile updated",user:safeUser(req.user)});
}
async function changePassword(req,res){
  const old=string(req.body.currentPassword,"Current password",1,72),next=string(req.body.newPassword,"New password",10,72);
  if(!(await bcrypt.compare(old,req.user.passwordHash)))return res.status(400).json({success:false,message:"Current password is incorrect"});
  if(!/[a-z]/.test(next)||!/[A-Z]/.test(next)||!/[0-9]/.test(next))return res.status(400).json({success:false,message:"New password must include upper and lower case letters and a number"});
  req.user.passwordHash=await bcrypt.hash(next,12);req.user.tokenVersion+=1;await req.user.save();setLoginCookie(res,req.user);res.json({success:true,message:"Password changed"});
}
async function deliverResetEmail(to,token){
  if(!emailReady()){if(process.env.NODE_ENV!=="production")return false;throw Object.assign(new Error("Password reset email is not configured"),{status:503});}
  const link=`${process.env.APP_URL||process.env.FRONTEND_URL||"http://localhost:5000"}/forgot-password.html?token=${encodeURIComponent(token)}`;
  return sendEmail({to,subject:"Reset your NESTORA password",text:`Use this link within 30 minutes to reset your password: ${link}`});
}
async function forgotPassword(req,res){
  const mail=email(req.body.email),user=await User.findOne({email:mail});let developmentResetToken;
  if(user){const token=randomToken();user.resetTokenHash=digest(token);user.resetTokenExpires=new Date(Date.now()+30*60*1000);await user.save();const sent=await deliverResetEmail(user.email,token);if(!sent)developmentResetToken=token;}
  const result={success:true,message:"If an account exists for this email, reset instructions have been prepared."};if(developmentResetToken)result.developmentResetToken=developmentResetToken;res.json(result);
}
async function resetPassword(req,res){
  const token=string(req.body.token,"Reset token",32,200),password=string(req.body.password,"Password",10,72);if(!/[a-z]/.test(password)||!/[A-Z]/.test(password)||!/[0-9]/.test(password))return res.status(400).json({success:false,message:"Password must include upper and lower case letters and a number"});
  const user=await User.findOne({resetTokenHash:digest(token),resetTokenExpires:{$gt:new Date()}}).select("+resetTokenHash +resetTokenExpires +passwordHash");if(!user)return res.status(400).json({success:false,message:"Reset link is invalid or has expired"});
  user.passwordHash=await bcrypt.hash(password,12);user.resetTokenHash=undefined;user.resetTokenExpires=undefined;user.tokenVersion+=1;await user.save();res.json({success:true,message:"Password reset successfully"});
}
module.exports={register,login,logout,me,verifyEmail,updateProfile,changePassword,forgotPassword,resetPassword,safeUser,setLoginCookie,clearLoginCookie};
