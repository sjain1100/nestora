require("dotenv").config();
const crypto=require("crypto");
const {connectDatabase}=require("./backend/config/db");
const app=require("./backend/app");

const previewOnly=process.env.NESTORA_FRONTEND_PREVIEW==="true";
if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32||/replace-with|change-me/i.test(process.env.JWT_SECRET)){
  if(previewOnly&&process.env.NODE_ENV!=="production")process.env.JWT_SECRET=crypto.randomBytes(48).toString("hex");
  else throw new Error("Set JWT_SECRET to a random value of at least 32 characters in .env");
}

async function start(){
  if(previewOnly&&process.env.NODE_ENV==="production")throw new Error("Frontend preview mode is disabled in production");
  if(!previewOnly)await connectDatabase();
  const port=Number(process.env.PORT||5000);
  return app.listen(port,()=>console.log(`NESTORA ${previewOnly?"frontend preview (API unavailable)":"MongoDB API"} at http://localhost:${port}`));
}
if(require.main===module)start().catch(err=>{console.error(`Failed to start NESTORA: ${err.message}`);process.exitCode=1;});
module.exports={app,start};
