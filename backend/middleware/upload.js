const multer=require("multer");
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:6}});
function verifyImages(req,res,next){
  const files=req.files||[];
  for(const file of files){
    let ext="";
    if(file.buffer.subarray(0,3).equals(Buffer.from([0xff,0xd8,0xff])))ext="jpg";
    else if(file.buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))ext="png";
    else if(file.buffer.subarray(0,4).toString()==="RIFF"&&file.buffer.subarray(8,12).toString()==="WEBP")ext="webp";
    if(!ext)return res.status(400).json({success:false,message:"Only valid JPEG, PNG, or WebP image files are accepted"});
    file.detectedExtension=ext;
  }
  next();
}
module.exports={upload,verifyImages};
