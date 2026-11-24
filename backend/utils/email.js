const nodemailer=require("nodemailer");

function resendReady(){return Boolean(process.env.RESEND_API_KEY&&process.env.RESEND_FROM);}
function smtpReady(){return Boolean(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASSWORD&&process.env.SMTP_FROM);}
function emailReady(){return resendReady()||smtpReady();}

async function sendEmail({to,subject,text}){
  if(resendReady()){
    let response;
    try{
      response=await fetch("https://api.resend.com/emails",{
        method:"POST",
        headers:{Authorization:"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json"},
        body:JSON.stringify({from:process.env.RESEND_FROM,to,subject,text}),
        signal:AbortSignal.timeout(10000)
      });
    }catch{
      throw Object.assign(new Error("Email service is temporarily unavailable"),{status:503,code:"EMAIL_PROVIDER_UNAVAILABLE"});
    }
    if(!response.ok)throw Object.assign(new Error("Email delivery failed"),{status:503,code:"EMAIL_DELIVERY_FAILED"});
    return true;
  }
  if(smtpReady()){
    const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_SECURE==="true",auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}});
    try{await transport.sendMail({from:process.env.SMTP_FROM,to,subject,text});}catch{throw Object.assign(new Error("Email service is temporarily unavailable"),{status:503,code:"EMAIL_PROVIDER_UNAVAILABLE"});}
    return true;
  }
  throw Object.assign(new Error("Email service is not configured"),{status:503});
}

module.exports={emailReady,sendEmail};
