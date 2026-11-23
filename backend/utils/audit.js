const AuditLog=require("../models/AuditLog");
async function writeAudit(actor,action,targetType="",targetId="",metadata={}){try{await AuditLog.create({actor,action,targetType,targetId:String(targetId||""),metadata});}catch(err){if(process.env.NODE_ENV!=="test")console.error("Audit write failed:",err.message);}}
module.exports={writeAudit};
