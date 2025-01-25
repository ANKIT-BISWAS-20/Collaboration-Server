import { Router } from "express";
import { uploadMaterial,
    deleteMaterial,
    getAllMaterials,
    giveMaterialFeedback
 } from "../controllers/material.controller.js";
import { upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {isLeader} from "../middlewares/isLeader.middleware.js";
import {isMember} from "../middlewares/isMember.middleware.js";
import {isTeamLeader} from "../middlewares/isTeamLeader.middleware.js";

const router = Router()


router.route("/upload-material").post(
    verifyJWT,
    isLeader,
    upload.fields([
        {
            name: "file",
            maxCount: 1
        }
    ]),
    uploadMaterial
)

router.route("/delete-material").delete(
    verifyJWT,
    isLeader,
    deleteMaterial
)

//common routes
router.route("/get-all-materials").get(
    verifyJWT,
    getAllMaterials
)

router.route("/give-material-feedback").post(
    verifyJWT,
    isMember,
    giveMaterialFeedback
)






export default router