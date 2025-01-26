import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";
import { Team } from "../models/team.model.js";
import dotenv from "dotenv"

dotenv.config({
    path: './.env'
})

export const isTeamLeader = asyncHandler(async(req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        const teamId = req.query.id
        if (!token) {
            throw new ApiError(401, "Unauthorized request")
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if (user.role !== "leader") {
            
            throw new ApiError(401, "Not A leader")
        }

        const teamfilter = await Team.find({_id: teamId, leader: user._id})
        if (teamfilter.length === 0) {
            throw new ApiError(401, "Not the team leader")
        }
      

        req.user = user;
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
    
})