import { Router } from "express";
import{
    createTask,
    deleteTask,
    getAllTask,
    giveTaskFeedback
} from "../controllers/task.controller.js";
import { upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isMember } from "../middlewares/isMember.middleware.js";
import { isLeader } from "../middlewares/isLeader.middleware.js";

const router = Router()


router.route("/create-task").post(
    verifyJWT,
    isLeader,
    upload.fields([
        {
            name: "file",
            maxCount: 1
        }
    ]),
    createTask
)

router.route("/delete-task").delete(
    verifyJWT,
    isLeader,
    deleteTask
)

router.route("/get-all-tasks").get(
    verifyJWT,
    getAllTask
)

router.route("/give-task-feedback").post(
    verifyJWT,
    isMember,
    giveTaskFeedback
)



export default router