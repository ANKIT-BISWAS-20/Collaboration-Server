import { Router } from "express";
import {
    createTeam,
    updateTeam,
    updateThumbnail,
    joinTeam,
    leaveTeam,
    acceptJoinInvitation,
    rejectJoinInvitation,
    getAllTeamsForMember,
    getMyTeamsForMember,
    getMyTeamsForLeader,
    removeMemberFromTeam,
    getMyTeamDashboardMember,
    getMyTeamDashboardLeader,
    viewAllJoinInvitation,
    deleteTeam,
    giveTeamFeedback,
    giveMemberFeedback,
    getTeamAnalytics
} from "../controllers/team.controller.js"
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {isMember} from "../middlewares/isMember.middleware.js";
import {isLeader} from "../middlewares/isLeader.middleware.js";
import { isTeamLeader } from "../middlewares/isTeamLeader.middleware.js";

const router = Router()

router.route("/create").post(
    verifyJWT,
    isLeader,
    upload.fields([
        {
            name: "thumbnail",
            maxCount: 1
        }
    ]),
    createTeam
)

router.route("/update").patch(
    verifyJWT,
    isTeamLeader,
    updateTeam
)

router.route("/delete").delete(
    verifyJWT,
    deleteTeam
)

router.route("/update-thumbnail").patch(
    verifyJWT,
    isTeamLeader,
    upload.fields([
        {
            name: "thumbnail",
            maxCount: 1
        }
    ]),
    updateThumbnail
)


router.route("/view-all-join-invitations").get(
    verifyJWT,
    isTeamLeader,
    viewAllJoinInvitation
)

router.route("/accept-join-invitation").patch(
    verifyJWT,
    isTeamLeader,
    acceptJoinInvitation
)

router.route("/reject-join-invitation").patch(
    verifyJWT,
    isTeamLeader,
    rejectJoinInvitation
)

router.route("/get-my-teams-for-leader").get(
    verifyJWT,
    isLeader,
    getMyTeamsForLeader
)

router.route("/remove-member-from-team").delete(
    verifyJWT,
    isTeamLeader,
    removeMemberFromTeam
)

router.route("/get-my-team-dashboard-leader").get(
    verifyJWT,
    isLeader,
    getMyTeamDashboardLeader
)

router.route("/give-member-feedback").post(
    verifyJWT,
    isLeader,
    giveMemberFeedback
)


router.route("/join").post(
    verifyJWT,
    isMember,
    joinTeam
)

router.route("/leave").delete(
    verifyJWT,
    isMember,
    leaveTeam
)

router.route("/get-all-teams-for-member").get(
    verifyJWT,
    isMember,
    getAllTeamsForMember
)

router.route("/get-my-teams-for-member").get(
    verifyJWT,
    isMember,
    getMyTeamsForMember
)


router.route("/get-my-team-dashboard-member").get(
    verifyJWT,
    isMember,
    getMyTeamDashboardMember
)

router.route("/give-team-feedback").post(
    verifyJWT,
    isMember,
    giveTeamFeedback
)
// common routes
router.route("/get-team-analytics").get(
    verifyJWT,
    getTeamAnalytics
)



export default router