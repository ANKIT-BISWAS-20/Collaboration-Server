import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User} from "../models/user.model.js"
import { Team } from "../models/team.model.js"
import { Material } from "../models/material.model.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { Feedback } from "../models/feedback.model.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";
import dotenv from "dotenv"
import { TeamMember } from "../models/teamMember.model.js";
import axios from "axios"


dotenv.config({
    path: './.env'
})




const uploadMaterial = asyncHandler( async (req, res) => {
    const teamId = req.query.teamId
    const userId = req.user._id
    const current_user = await User.findById(userId)
    const current_team= await Team.findById(teamId)
    if (current_team.leader.toString() !== current_user._id.toString()) {
        throw new ApiError(400, "You are not leader of this team")
    }

    const {name, description,type} = req.body
    if (
        [userId, name, teamId, description,type].some((field) => field === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }


    const fileLocalPath = req.files?.file[0]?.path;

    if (!fileLocalPath) {
        throw new ApiError(400, " file is required")
    }

    const file = await uploadOnCloudinary(fileLocalPath)
    if (!file) {
        throw new ApiError(400, " file is required")
    }
   

    const myMaterial = await Material.create({
        team: teamId,
        file: file.url,
        name:name, 
        description:description,
        owner: current_user._id,
        type:type,
    })

    const createdMaterial = await Material.findById(myMaterial._id)

    if (!createdMaterial) {
        throw new ApiError(500, "Something went wrong while creating the team")
    }

    return res.status(201).json(
        new ApiResponse(200, {user: current_user,
            createdMaterial:createdMaterial,
        }, "Material Added Successfully")
    )
})


const deleteMaterial = asyncHandler( async (req, res) => {
    const teamId = req.query.teamId
    const materialId = req.query.materialId
    const userId = req.user._id

    const material = await Material.findById(materialId)
    if (!material) {
        throw new ApiError(400, "Material not found")
    }

    const teamMember = await TeamMember.findOne({
        member: userId,
        team: teamId,
        role: "leader",
        status: "accepted"
    })

    if (!teamMember) {
        throw new ApiError(400, "You are not leader of this team")
    }

    await Material.findByIdAndDelete(materialId)

    return res.status(200).json(
        new ApiResponse(200, {}, "Material Deleted Successfully")
    )
})


const getAllMaterials = asyncHandler( async (req, res) => {
    const teamId = req.query.teamId
    const userId = req.user._id

    const current_team= await Team.findById(teamId)
    const current_user = await User.findById(userId)
    if (current_team.leader.toString() !== current_user._id.toString()) {
        const teamMember = await TeamMember.findOne({
            member: userId,
            team: teamId,
            status: "accepted"
        })
    
        if (!teamMember) {
            throw new ApiError(400, "You are not member of this team")
        }
    }

    const materials = await Material.aggregate([
        {
            "$match": {
                "team": current_team._id
            }
        },
        {
            "$sort": {
               "createdAt": 1
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200, materials, "Materials Fetched Successfully")
    )
})


const giveMaterialFeedback = asyncHandler( async (req, res) => {
    const materialId = req.query.materialId
    const material = await Material.findById(materialId)
    if (!material) {
        throw new ApiError(400, "Material not found")
    }
    const userId = req.user._id
    const {communication, collaboration, accountability,text} = req.body

    const isTeamMember = await TeamMember.find({
        member: userId,
        team: material.team,
        status: "accepted"
    })

    if (!isTeamMember) {
        throw new ApiError(400, "You are not member of this team")
    }

    if (
        [userId,text, materialId, communication, collaboration, accountability].some((field) => field === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    

    // TODO: emotion calculation
    let emotion;
    if (text.includes("good")) {
        emotion = "POSITIVE";
    } else if (text.includes("bad")) {
        emotion = "NEGATIVE";
    }
    const isfeedbackGiven = await Feedback.findOne({
        provider: userId,
        type: "material",
        forMaterial: materialId
    })

    if (isfeedbackGiven) {
        throw new ApiError(409, "You have already given feedback for this material")
    }

    const feedback = await Feedback.create({
        provider: userId,
        type: "material",
        communication: communication,
        collaboration: collaboration,
        accountability: accountability,
        usefulness: usefulness,
        reliability: reliability,
        text: text,
        emotion: emotion,
        forMaterial: materialId,
    })

    return res.status(201).json(
        new ApiResponse(200, feedback, "Feedback Added Successfully")
    )
})





export {
    uploadMaterial,
    deleteMaterial,
    getAllMaterials,
    giveMaterialFeedback
}