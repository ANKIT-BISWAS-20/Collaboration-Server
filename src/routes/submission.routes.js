import { Router } from "express";
import {
    submitTask,
    viewSubmission,
    viewAllSubmissions,
    markSubmission
} from "../controllers/submission.controller.js"
import { upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isMember } from "../middlewares/isMember.middleware.js";
import { isLeader } from "../middlewares/isLeader.middleware.js";

const router = Router()


router.route("/view-all-submissions").get(
    verifyJWT,
    isLeader,
    viewAllSubmissions
)

router.route("/mark-submission").put(
    verifyJWT,
    isLeader,
    markSubmission
)


//common routes


router.route("/submit-task").post(
    verifyJWT,
    isMember,
    upload.fields([
        {
            name: "document",
            maxCount: 1
        }
    ]),
    submitTask
)

router.route("/view-submission").get(
    verifyJWT,
    isMember,
    viewSubmission
)


export default router