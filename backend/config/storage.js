const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const root = path.resolve(__dirname, "../../uploads");
const configured = () => process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;
const sha1 = value => crypto.createHash("sha1").update(value).digest("hex");
async function saveImage(file) {
  if (configured()) {
    const timestamp = Math.floor(Date.now()/1000).toString();
    const folder = process.env.CLOUDINARY_FOLDER || "nestora/properties";
    const signature = sha1(`folder=${folder}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`);
    const form = new FormData(); form.append("file",new Blob([file.buffer],{type:file.mimetype}),file.originalname); form.append("api_key",process.env.CLOUDINARY_API_KEY); form.append("timestamp",timestamp); form.append("folder",folder); form.append("signature",signature);
    const response=await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,{method:"POST",body:form});
    const result=await response.json(); if(!response.ok)throw Object.assign(new Error("Image storage failed"),{status:502});
    return {url:result.secure_url,publicId:result.public_id};
  }
  if(process.env.NODE_ENV === "production") throw Object.assign(new Error("Configure Cloudinary before accepting production uploads"),{status:503});
  await fs.mkdir(root,{recursive:true}); const ext=file.detectedExtension; const name=`${crypto.randomUUID()}.${ext}`; await fs.writeFile(path.join(root,name),file.buffer,{flag:"wx"});
  return {url:`/uploads/${name}`,publicId:`local:${name}`};
}
async function deleteImage(image) {
  if(!image?.publicId)return;
  if(image.publicId.startsWith("local:")) { const name=path.basename(image.publicId.slice(6)); try{await fs.unlink(path.join(root,name));}catch(err){if(err.code!=="ENOENT")throw err;} return; }
  if(configured()) { const timestamp=Math.floor(Date.now()/1000).toString(); const signature=sha1(`public_id=${image.publicId}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`); const body=new URLSearchParams({public_id:image.publicId,timestamp,api_key:process.env.CLOUDINARY_API_KEY,signature}); const response=await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/destroy`,{method:"POST",body}); if(!response.ok)throw Object.assign(new Error("Could not remove stored image"),{status:502}); }
}
module.exports={saveImage,deleteImage,root,cloudinaryConfigured:configured};
