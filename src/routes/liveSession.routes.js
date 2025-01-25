import { Router } from "express";
import { 
    createLiveSession,
    deleteLiveSession,
    getAllLiveSessions
} from "../controllers/liveSession.controller.js"
import { upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isLeader } from "../middlewares/isLeader.middleware.js";

const router = Router()



router.route("/create-live-session").post(
    verifyJWT,
    isLeader,
    createLiveSession
)

router.route("/delete-live-session").delete(
    verifyJWT,
    isLeader,
    deleteLiveSession
)

//common routes
router.route("/get-all-live-sessions").get(
    verifyJWT,
    getAllLiveSessions
)





export default router