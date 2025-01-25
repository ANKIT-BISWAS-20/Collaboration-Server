import { Router } from "express";
import { getAllComments,createComment  } from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()


router.route("/get-all-comments").get(
    verifyJWT,
    getAllComments
)

router.route("/create-comment").post(
    verifyJWT,
    createComment
)


export default router