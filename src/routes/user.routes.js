import { Router } from "express";
import { registerUser ,
     loginUser,
      logoutUser,
       refreshAccessToken,
       updateUserAvatar,
       updateAccountDetails,
       getCurrentMember,
       getCurrentLeader,
       getAnalytics
    } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isMember } from "../middlewares/isMember.middleware.js";
import { isLeader } from "../middlewares/isLeader.middleware.js";

const router = Router()


router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(verifyJWT,  logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/update-account").patch(verifyJWT, updateAccountDetails)
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)



//member features
router.route("/get-current-member").get(verifyJWT, isMember, getCurrentMember)
router.route("/get-analytics").get(verifyJWT,isMember, getAnalytics)

//leader features
router.route("/get-current-leader").get(verifyJWT, isLeader, getCurrentLeader)

export default router