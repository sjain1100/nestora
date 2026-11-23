const express=require("express");const router=express.Router();const c=require("../controllers/propertyController");const {requireAuth,allowRoles}=require("../middleware/auth");const {upload,verifyImages}=require("../middleware/upload");
router.get("/",c.list);router.get("/featured",c.featured);router.get("/mine",requireAuth,allowRoles("broker","seller","admin"),c.mine);router.get("/:id",c.detail);
router.post("/",requireAuth,allowRoles("broker","seller"),c.create);router.patch("/:id",requireAuth,allowRoles("broker","seller","admin"),c.update);router.delete("/:id",requireAuth,allowRoles("broker","seller","admin"),c.remove);
router.post("/:id/withdraw",requireAuth,allowRoles("broker","seller"),c.withdraw);router.post("/:id/images",requireAuth,allowRoles("broker","seller"),upload.array("images",6),verifyImages,c.uploadImages);
module.exports=router;
