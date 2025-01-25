import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User} from "../models/user.model.js"
import { Team } from "../models/team.model.js";
import { LiveSession } from "../models/liveSession.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";
import dotenv from "dotenv"
import { TeamMember } from "../models/teamMember.model.js";

dotenv.config({
    path: './.env'
})


const createLiveSession = asyncHandler( async (req, res) => {
    const userId = req.user._id
    const teamId = req.query.teamId;
    const current_user = await User.findById(userId)
    const {startTime, endTime, topic} = req.body
    if (
        [userId, startTime, endTime, topic, teamId].some((field) => field === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }
    const current_team= await Team.findById(teamId)
    if (current_team.leader.toString() !== current_user._id.toString()) {
        throw new ApiError(400, "You are not leader of this team")
    }
    const myLiveSession = await LiveSession.create({
        owner: userId,
        startTime: startTime,
        endTime: endTime,
        topic: topic,
        team: teamId
    })
    const createdLiveSession = await LiveSession.findById(myLiveSession._id)
    if (!createdLiveSession) {
        throw new ApiError(400, "Live Session not created")
    }
    return res.status(201).json(
        new ApiResponse(200, {user: current_user,
            createdLiveSession:createdLiveSession,
        }, "Live Session Added Successfully")
    )
});

const deleteLiveSession = asyncHandler( async (req, res) => {
    const userId = req.user._id
    const current_user = await User.findById(userId)
    const liveSessionId = req.query.liveSessionId
    const current_live_session= await LiveSession.findById(liveSessionId)
    if (current_live_session.owner.toString() !== current_user._id.toString()) {
        throw new ApiError(400, "You are not owner of this live session")
    }
    const deletedLiveSession = await LiveSession.findByIdAndDelete(liveSessionId)
    if (!deletedLiveSession) {
        throw new ApiError(400, "Live session not deleted")
    }
    return res.status(200).json(
        new ApiResponse(200, {user: current_user,
            deletedLiveSession: deletedLiveSession,
        }, "Live Session Deleted Successfully")
    )
})

const getAllLiveSessions = asyncHandler( async (req, res) => {
    const userId = req.user._id
    const current_user = await User.findById(userId)
    const teamId = req.query.teamId
    const current_team= await Team.findById(teamId)
    const teamMember = await TeamMember.findOne({team: teamId, member: userId, status: "accepted"})
    function getCurrentDateTimeLocal() {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    const current_time = getCurrentDateTimeLocal();
    if (!teamMember) {
        throw new ApiError(400, "You are not a member of this team")
    }
    const liveSessions = await LiveSession.aggregate([
        {
            $match: {
                team: current_team._id
            }
        },
        {
            $addFields: {
                status: {
                    $switch: {
                        branches: [
                            {
                                case: { $lt: ["$startTime", current_time] },
                                then: {
                                    $cond: {
                                        if: { $lt: ["$endTime", current_time] },
                                        then: "over",
                                        else: "live"
                                    }
                                }
                            },
                            {
                                case: { $gte: ["$startTime", current_time] },
                                then: "upcoming"
                            }
                        ],
                        default: "upcoming"
                    }
                }
            }
        }
    ])

    if (!liveSessions) {
        throw new ApiError(400, "No live sessions found")
    }
    return res.status(200).json(
        new ApiResponse(200, liveSessions, "Live Sessions Fetched Successfully")
    )
});

export {
    createLiveSession,
    deleteLiveSession,
    getAllLiveSessions
}