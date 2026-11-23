require("dotenv").config();
const crypto=require("crypto");
const {connectDatabase}=require("./backend/config/db");
const app=require("./backend/app");

const previewOnly=process.env.NESTORA_FRONTEND_PREVIEW==="true";
if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32||/replace-with|change-me/i.test(process.env.JWT_SECRET)){
  if(previewOnly&&process.env.NODE_ENV!=="production")process.env.JWT_SECRET=crypto.randomBytes(48).toString("hex");
  else throw new Error("Set JWT_SECRET to a random value of at least 32 characters in .env");
}

function validateProductionConfig(){
  if(process.env.NODE_ENV!=="production")return;
  const required=["MONGO_URI","CLOUDINARY_CLOUD_NAME","CLOUDINARY_API_KEY","CLOUDINARY_API_SECRET","SMTP_HOST","SMTP_USER","SMTP_PASSWORD","SMTP_FROM"];
  const missing=required.filter(key=>!String(process.env[key]||"").trim());
  if(missing.length)throw Object.assign(new Error("Production configuration is incomplete"),{code:"MISSING_PRODUCTION_ENV",missing});
}

async function start(){
  if(previewOnly&&process.env.NODE_ENV==="production")throw new Error("Frontend preview mode is disabled in production");
  if(!previewOnly){validateProductionConfig();await connectDatabase();}
  const port=Number(process.env.PORT||5000);
  return app.listen(port,()=>console.log(`NESTORA ${previewOnly?"frontend preview (API unavailable)":"MongoDB API"} at http://localhost:${port}`));
}
if(require.main===module)start().catch(err=>{
  if(err.code==="MISSING_PRODUCTION_ENV")console.error("Failed to start NESTORA: missing production variables "+err.missing.join(", "));
  else if(err.code==="EADDRINUSE")console.error("Failed to start NESTORA: the configured port is already in use.");
  else if(String(err.message||"").startsWith("Set JWT_SECRET"))console.error("Failed to start NESTORA: "+err.message);
  else console.error("Failed to start NESTORA: check required configuration and database connectivity. Sensitive values were not logged.");
  process.exitCode=1;
});
module.exports={app,start,validateProductionConfig};
