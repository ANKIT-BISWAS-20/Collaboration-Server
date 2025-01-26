import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import {Team} from "../models/team.model.js"
import { Chat } from "../models/chat.model.js";
import {TeamMember} from "../models/teamMember.model.js"
import { Material } from "../models/material.model.js"
import {Task} from "../models/task.model.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { Feedback } from "../models/feedback.model.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";
import dotenv from "dotenv"
const { ObjectId } = mongoose.Types;
import axios from "axios"

dotenv.config({
    path: './.env'
})

const createTeam = asyncHandler(async (req, res) => {

    const current_user = await User.findById(req.user?._id)
    const { teamname, title, description, category } = req.body

    if (
        [teamname, title, description, category].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }


    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail file is required")
    }
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if (!thumbnail) {
        throw new ApiError(400, "Thumbnail file is required")
    }


    const myTeam = await Team.create({
        teamname,
        thumbnail: thumbnail.url,
        title,
        description,
        category,
        owner: current_user._id,
    })

    const createdTeam = await Team.findById(myTeam._id)

    if (!createdTeam) {
        throw new ApiError(500, "Something went wrong while creating the team")
    }

    const createdTeamMember = await TeamMember.create({
        team: createdTeam._id,
        member: current_user._id,
        role: "leader",
        status: "accepted"
    })

    if (!createdTeamMember) {
        throw new ApiError(500, "Something went wrong while creating the team")
    }


    return res.status(201).json(
        new ApiResponse(200, {
            user: current_user,
            createdTeam: createdTeam,
            createdTeamMember: createdTeamMember
        }, "Team Created Successfully")
    )

})


const updateTeam = asyncHandler(async (req, res) => {

    const { teamname, title, description, category } = req.body
    const teamId = req.params.id

    if (
        [teamname, title, description, category].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const myTeam = await Team.findById(teamId)

    if (!myTeam) {
        throw new ApiError(404, "Team not found")
    }

    myTeam.teamname = teamname
    myTeam.title = title
    myTeam.description = description
    myTeam.category = category

    myTeam.save()

    const updatedTeam = await Team.findById(myTeam._id)

    return res.status(200).json(
        new ApiResponse(200, updatedTeam, "Team Updated Successfully")
    )
})


const updateThumbnail = asyncHandler(async (req, res) => {

    const teamId = req.params.id

    const myTeam = await Team.findById(teamId)

    if (!myTeam) {
        throw new ApiError(404, "Team not found")
    }

    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail file is required")
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if (!thumbnail) {
        throw new ApiError(400, "Thumbnail file is required")
    }

    myTeam.thumbnail = thumbnail.url
    myTeam.save()

    const updatedTeam = await Team.findById(myTeam._id)

    return res.status(200).json(
        new ApiResponse(200, updatedTeam, "Team Updated Successfully")
    )
})

const viewAllJoinInvitation = asyncHandler(async (req, res) => {
    const teamId = req.query.id
    const myTeam = await Team.findById(teamId)
    if (!myTeam) {
        throw new ApiError(404, "Team not found")
    }
    const teamMembers = await TeamMember.aggregate([
        {
            "$match": {
                "team": myTeam._id,
                "status": "pending"
            }
        },
        {
            "$lookup": {
                "from": "users",
                "localField": "member",
                "foreignField": "_id",
                "as": "memberInfo"
            }
        },
        {
            "$unwind": "$memberInfo"
        },
        {
            "$project": {
                "memberInfo.password": 0,
                "memberInfo.refreshToken": 0
            }
        }
    ]
    )

    return res.status(200).json(
        new ApiResponse(200, teamMembers, "Join Invitations fetched successfully")
    )
})


const acceptJoinInvitation = asyncHandler(async (req, res) => {

    const teamId = req.query.id
    const memberId = req.body.memberId

    const myTeam = await Team.findById(teamId)

    if (!myTeam) {
        throw new ApiError(404, "Team not found")
    }

    const teamMember = await TeamMember.findOne({
        team: teamId,
        member: memberId
    })

    if (!teamMember) {
        throw new ApiError(404, "Member not found")
    }

    teamMember.status = "accepted"
    teamMember.save()

    const updatedTeamMember = await TeamMember.findById(teamMember._id)

    return res.status(200).json(
        new ApiResponse(200, updatedTeamMember, "Member accepted successfully")
    )
})


const rejectJoinInvitation = asyncHandler(async (req, res) => {

    const teamId = req.query.id
    const memberId = req.body.memberId

    const myTeam = await Team.findById(teamId)

    if (!myTeam) {
        throw new ApiError(404, "Team not found")
    }

    const teamMember = await TeamMember.findOne({
        team: teamId,
        member: memberId
    })

    if (!teamMember) {
        throw new ApiError(404, "Member not found")
    }

    await TeamMember.findByIdAndDelete(teamMember._id)

    return res.status(200).json(
        new ApiResponse(200, [], "Member rejected successfully")
    )
})

const getMyTeamsForLeader = asyncHandler(async (req, res) => {
    const current_user = await User.findById(req.user?._id)
    const myTeams = await TeamMember.aggregate([
        {
            '$match': {
                'member': current_user._id,
                'role': 'leader'
            }
        }, {
            '$lookup': {
                'from': 'teams',
                'localField': 'team',
                'foreignField': '_id',
                'as': 'teamInfo'
            }
        }, {
            '$lookup': {
                'from': 'users',
                'localField': 'teamInfo.owner',
                'foreignField': '_id',
                'as': 'ownerInfo'
            }
        }, {
            '$unset': [
                'ownerInfo.password', 'ownerInfo.refreshToken'
            ]
        }
    ])
    return res.status(200).json(
        new ApiResponse(200, myTeams, "My Teams fetched successfully")
    )
})

const removeMemberFromTeam = asyncHandler(async (req, res) => {
    const teamId = req.query.id
    const memberId = req.query.memberId

    const myTeam = await Team.findById(teamId)

    if (!myTeam) {
        throw new ApiError(404, "Team not found")
    }

    const teamMember = await TeamMember.findOne({
        team: teamId,
        member: memberId
    })

    if (!teamMember) {
        throw new ApiError(404, "Member not found")
    }

    await TeamMember.findByIdAndDelete(teamMember._id)

    return res.status(200).json(
        new ApiResponse(200, [], "Member removed successfully")
    )
})

const getMyTeamDashboardLeader = asyncHandler(async (req, res) => {
    const current_user = await User.findById(req.user?._id).select("-password -refreshToken")
    const teamId = req.query.id
    const myTeam = await Team.findById(teamId)
    if (!myTeam) {
        throw new ApiError(404, "Team not found")
    }

    if (myTeam.leader.toString() !== current_user._id.toString()) {
        throw new ApiError(401, "unauthorized")
    }

    const teamInfo = await Team.aggregate([
        {
            "$match": {
                "_id": myTeam._id
            }
        },
        {
            "$lookup": {
                "from": "teammembers",
                "localField": "_id",
                "foreignField": "team",
                "as": "members"
            }
        },
        {
            "$unwind": "$members"
        },
        {
            "$lookup": {
                "from": "users",
                "localField": "members.member",
                "foreignField": "_id",
                "as": "memberInfo"
            }
        },
        {
            "$unwind": "$memberInfo"
        },
        {
            "$match": {
                "members.status": "accepted"
            }
        },
        {
            "$project": {
                "memberInfo.password": 0,
                "memberInfo.refreshToken": 0
            }
        }
    ]
    )
    return res.status(200).json(
        new ApiResponse(200, { team: myTeam, members: teamInfo, leader: current_user }, "Team Info fetched successfully")
    )
})

const deleteTeam = asyncHandler(async (req, res) => {
    const teamId = req.query.id
    const current_user = await User.findById(req.user?._id)
    const myTeam = await Team.findById(teamId)
    if (!myTeam) {
        throw new ApiError(404, "Team not found")
    }
    if (myTeam.leader.toString() !== current_user._id.toString()) {
        throw new ApiError(401, "Not Team Leader")
    }
    await Team.findByIdAndDelete(teamId)
    await TeamMember.deleteMany({ team: teamId })
    await Material.deleteMany({ team: teamId })
    await Task.deleteMany({ team: teamId })
    return res.status(200).json(
        new ApiResponse(200, null, "Team deleted successfully")
    )
})


const giveMemberFeedback = asyncHandler(async (req, res) => {
    const current_user = await User.findById(req.user._id)
    const teamId = req.query.id
    const memberId = req.query.memberId
    const myMember = await User.findById(memberId)
    if (!myMember) {
        throw new ApiError(404, "Member not found")
    }
    const current_team = await Team.findById(teamId)
    if (current_team.leader.toString() !== current_user._id.toString()) {
        throw new ApiError(401, "unauthorized")
    }
    const isany = await Feedback.find({ provider: current_user._id, type: "member", forMember: memberId, forTeam: teamId })

    //TODO: Add emotion
    const { text } = req.body
    let emotion;
    if (isany.length > 0) {
        const feedback = await Feedback.findByIdAndUpdate(isany[0]._id, { text: text, emotion: emotion })
        return res.status(200).json(
            new ApiResponse(200, feedback, "Feedback Updated successfully")
        )
    }
    try {
        const response = await axios.post(`${process.env.SENTIMENT_ANALYSIS_API}/sentiment?text=${text}`)
        emotion = response.data.emotion
    } catch (err) {
        throw new ApiError(400, "Sentiment Analysis API is not working")
    }
    const feedback = await Feedback.create({
        provider: current_user._id,
        type: "member",
        text: text,
        emotion: emotion,
        forMember: memberId,
        forTeam: teamId
    })
    return res.status(200).json(
        new ApiResponse(200, feedback, "Feedback given successfully")
    )
})

const joinTeam = asyncHandler(async (req, res) => {

    const teamId = req.body.id
    const current_user = await User.findById(req.user?._id)

    const myTeam = await Team.findById(teamId)

    if (!myTeam) {
        throw new ApiError(404, "Team not found")
    }

    const teamMember = await TeamMember.findOne({
        team: teamId,
        member: current_user._id
    })

    if (teamMember?.status === "accepted") {
        throw new ApiError(400, "You are already a member of this team")
    }
    if (teamMember?.status === "pending") {
        throw new ApiError(409, "You have already requested to join this team")
    }

    await TeamMember.create({
        team: teamId,
        member: current_user._id,
        role: "member",
        status: "pending"
    })

    const createdTeamMember = await TeamMember.findById(TeamMember._id)

    return res.status(200).json(
        new ApiResponse(200, createdTeamMember, "Request to join team sent successfully")
    )
})

const leaveTeam = asyncHandler(async (req, res) => {
    const teamId = req.query.id
    const current_user = await User.findById(req.user?._id)

    const myTeam = await Team.findById(teamId)

    if (!myTeam) {
        throw new ApiError(404, "Team not found")
    }

    const teamMember = await TeamMember.findOne({
        team: teamId,
        member: current_user._id
    })

    if (!teamMember) {
        throw new ApiError(400, "You are not a member of this team")
    }

    await TeamMember.findByIdAndDelete(teamMember._id)

    return res.status(200).json(
        new ApiResponse(200, null, "You have left the team successfully")
    )
})

const getAllTeamsForMember = asyncHandler(async (req, res) => {
    const query = req.query.input
    let teams;
    if (query == "") {
        teams = await Team.aggregate([
            {
                "$lookup": {
                    "from": "users",
                    "localField": "leader",
                    "foreignField": "_id",
                    "as": "owner"
                }
            },
            {
                "$lookup": {
                    "from": "teammembers",
                    "localField": "_id",
                    "foreignField": "team",
                    "as": "members"
                }
            },
            {
                "$addFields": {
                    "owner": {
                        "$map": {
                            "input": "$owner",
                            "as": "owner",
                            "in": {
                                "_id": "$$owner._id",
                                "fullName": "$$owner.fullName",
                                "username": "$$owner.username",
                                "email": "$$owner.email",
                                "createdAt": "$$owner.createdAt"
                            }
                        }
                    },
                    "membersCount": {
                        "$size": "$members"
                    }
                }
            },
            {
                "$unset": [
                    "members",
                    "owner.password",
                    "owner.refreshToken"
                ]
            }
        ]);
    } else {
        teams = await Team.aggregate([
            {
                "$match": {
                    "teamname": query
                }
            },
            {
                "$lookup": {
                    "from": "users",
                    "localField": "leader",
                    "foreignField": "_id",
                    "as": "owner"
                }
            },
            {
                "$lookup": {
                    "from": "teammembers",
                    "localField": "_id",
                    "foreignField": "team",
                    "as": "members"
                }
            },
            {
                "$addFields": {
                    "owner": {
                        "$map": {
                            "input": "$owner",
                            "as": "owner",
                            "in": {
                                "_id": "$$owner._id",
                                "username": "$$owner.username",
                                "email": "$$owner.email",
                                "createdAt": "$$owner.createdAt"
                            }
                        }
                    },
                    "membersCount": {
                        "$size": "$members"
                    }
                }
            },
            {
                "$unset": [
                    "members",
                    "owner.password",
                    "owner.refreshToken"
                ]
            }
        ]);
    }

    return res.status(200).json(
        new ApiResponse(200, teams, "Teams fetched successfully")
    )
})

const getMyTeamsForMember = asyncHandler(async (req, res) => {
    const current_user = await User.findById(req.user?._id)
    const query = req.query.input
    let myTeams;
    if (query == "") {
        myTeams = await TeamMember.aggregate([
            {
                '$match': {
                    'member': current_user._id,
                    'role': 'member',
                    'status': 'accepted'
                }
            }, {
                '$lookup': {
                    'from': 'teams',
                    'localField': 'team',
                    'foreignField': '_id',
                    'as': 'teamInfo'
                }
            }, {
                '$lookup': {
                    'from': 'users',
                    'localField': 'teamInfo.leader',
                    'foreignField': '_id',
                    'as': 'ownerInfo'
                }
            }, {
                '$unset': [
                    'ownerInfo.password', 'ownerInfo.refreshToken'
                ]
            }
        ])
    } else {
        myTeams = await TeamMember.aggregate([
            {
                '$lookup': {
                    'from': 'teams',
                    'localField': 'team',
                    'foreignField': '_id',
                    'as': 'teamInfo'
                }
            }, {
                '$match': {
                    '$or': [
                        {
                            'teamInfo.teamname': query
                        }, {
                            'member': current_user._id
                        }
                    ]
                }
            }, {
                '$lookup': {
                    'from': 'users',
                    'localField': 'teamInfo.leader',
                    'foreignField': '_id',
                    'as': 'ownerInfo'
                }
            }, {
                '$unset': [
                    'ownerInfo.password', 'ownerInfo.refreshToken'
                ]
            }
        ])
    }

    return res.status(200).json(
        new ApiResponse(200, myTeams, "My Teams fetched successfully")
    )

})


const getMyTeamDashboardMember = asyncHandler(async (req, res) => {
    const current_user = await User.findById(req.user?._id)
    const teamId = req.query.id
    const myTeam = await Team.findById(teamId)
    if (!myTeam) {
        throw new ApiError(404, "Team not found")
    }
    const teamMember = await TeamMember.findOne({
        team: teamId,
        member: current_user._id,
        role: "member",
        status: "accepted"
    })
    if (!teamMember) {
        throw new ApiError(401, "unauthorized")
    }
    const teamInfo = await Team.aggregate([
        {
            "$match": {
                "_id": myTeam._id
            }
        },
        {
            "$lookup": {
                "from": "teammembers",
                "localField": "_id",
                "foreignField": "team",
                "as": "members"
            }
        },
        {
            "$unwind": "$members"
        },
        {
            "$lookup": {
                "from": "users",
                "localField": "members.member",
                "foreignField": "_id",
                "as": "memberInfo"
            }
        },
        {
            "$unwind": "$memberInfo"
        },
        {
            "$match": {
                "members.status": "accepted"
            }
        },
        {
            "$project": {
                "memberInfo.password": 0,
                "memberInfo.refreshToken": 0
            }
        }
    ]
    )

    const leader = await User.findById(myTeam.leader).select("-password -refreshToken")


    return res.status(200).json(
        new ApiResponse(200, { team: myTeam, members: teamInfo, leader: leader }, "Team Info fetched successfully")
    )

})


const giveTeamFeedback = asyncHandler(async (req, res) => {
    const current_user = await User.findById(req.user._id)
    const teamId = req.query.id
    const myTeam = await Team.findById(teamId)
    if (!myTeam) {
        throw new ApiError(404, "Team not found")
    }

    const { text } = req.body

    const teamMember = await TeamMember.findOne({
        team: teamId,
        member: current_user._id,
        role: "member",
        status: "accepted"
    })
    if (!teamMember) {
        throw new ApiError(401, "unauthorized")
    }

    const isany = await Feedback.find({ provider: current_user._id, type: "team", forTeam: teamId })

    // TODO: Add emotion


    let emotion;
    try {
        const response = await axios.post(`${process.env.SENTIMENT_ANALYSIS_API}/sentiment?text=${text}`)
        emotion = response.data.emotion
    } catch (err) {
        throw new ApiError(400, "Sentiment Analysis API is not working")
    }
    if (isany.length > 0) {
        const feedback = await Feedback.findByIdAndUpdate(isany[0]._id, { text: text, emotion: emotion })
        return res.status(200).json(
            new ApiResponse(200, feedback, "Feedback Updated successfully")
        )
    }
    const feedback = await Feedback.create({
        provider: current_user._id,
        type: "team",
        text: text,
        emotion: emotion,
        forTeam: myTeam._id,
    })
    return res.status(200).json(
        new ApiResponse(200, feedback, "Feedback given successfully")
    )

})

const getTeamAnalytics = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const teamId = req.query.teamId;
    const myTeam = await Team.findById(teamId);
    if (!myTeam) {
        throw new ApiError(404, "Team not found")
    }
    const teamMember = await TeamMember.findOne({
        team: teamId,
        member: userId,
        status: "accepted"
    })
    if (!teamMember) {
        throw new ApiError(401, "unauthorized")
    }

    const teamFeedbacks = await Feedback.aggregate([
        {
            $match: {
                forTeam: myTeam._id,
            }
        },
        {
            $group: {
                _id: "$emotion",
                count: { $sum: 1 }
            }
        },
        {
            $project: {
                emotion: "$_id",
                count: 1,
                _id: 0
            }
        }
    ]);

    const taskFeedbacksEmotions = await Task.aggregate([
        {
            $match: {
                team: myTeam._id,
            }
        },
        {
            $lookup: {
                from: "feedbacks",
                localField: "_id",
                foreignField: "forTask",
                as: "feedbacks"
            }
        },
        {
            $unwind: {
                path: "$feedbacks",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $group: {
                _id: "$_id",
                description: { $first: "$description" },
                feedbacks: { $push: "$feedbacks" }
            }
        },
        {
            $addFields: {
                positiveFeedbackCount: {
                    $size: {
                        $filter: {
                            input: "$feedbacks",
                            as: "feedback",
                            cond: { $eq: ["$$feedback.emotion", "POSITIVE"] }
                        }
                    }
                },
                negativeFeedbackCount: {
                    $size: {
                        $filter: {
                            input: "$feedbacks",
                            as: "feedback",
                            cond: { $eq: ["$$feedback.emotion", "NEGATIVE"] }
                        }
                    }
                }
            }
        },
        {
            $project: {
                taskId: "$_id",
                description: 1,
                positiveFeedbackCount: 1,
                negativeFeedbackCount: 1,
                _id: 0
            }
        }
    ])

    const taskStarsCount = await Task.aggregate([
        {
            $match: {
                team: myTeam._id,
            }
        },
        {
            $lookup: {
                from: "feedbacks",
                localField: "_id",
                foreignField: "forTask",
                as: "feedbacks"
            }
        },
        {
            $addFields: {
                totalFeedbackCount: { $size: "$feedbacks" },
                fullCommunication: { $multiply: [5, { $size: "$feedbacks" }] },
                fullCollaboration: { $multiply: [5, { $size: "$feedbacks" }] },
                fullAccountability: { $multiply: [5, { $size: "$feedbacks" }] },
                totalCommunicationStars: { $sum: "$feedbacks.communication" },
                totalCollaborationStars: { $sum: "$feedbacks.collaboration" },
                totalAccountabilityStars: { $sum: "$feedbacks.accountability" }
            }
        },
        {
            $project: {
                _id: 0,
                taskId: "$_id",
                description: "$description",
                name: 1,
                totalFeedbackCount: 1,
                fullCommunication: 1,
                fullCollaboration: 1,
                fullAccountability: 1,
                totalCommunicationStars: 1,
                totalCollaborationStars: 1,
                totalAccountabilityStars: 1
            }
        }
    ]);


    const materialFeedbacksEmotions = await Material.aggregate([
        {
            $match: {
                team: myTeam._id,
            }
        },
        {
            $lookup: {
                from: "feedbacks",
                localField: "_id",
                foreignField: "forMaterial",
                as: "feedbacks"
            }
        },
        {
            $unwind: {
                path: "$feedbacks",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $group: {
                _id: "$_id",
                description: { $first: "$name" },
                feedbacks: { $push: "$feedbacks" }
            }
        },
        {
            $addFields: {
                positiveFeedbackCount: {
                    $size: {
                        $filter: {
                            input: "$feedbacks",
                            as: "feedback",
                            cond: { $eq: ["$$feedback.emotion", "POSITIVE"] }
                        }
                    }
                },
                negativeFeedbackCount: {
                    $size: {
                        $filter: {
                            input: "$feedbacks",
                            as: "feedback",
                            cond: { $eq: ["$$feedback.emotion", "NEGATIVE"] }
                        }
                    }
                }
            }
        },
        {
            $project: {
                materialId: "$_id",
                description: 1,
                positiveFeedbackCount: 1,
                negativeFeedbackCount: 1,
                _id: 0
            }
        }
    ])


    const materialStarsCount = await Material.aggregate([
        {
            $match: {
                team: myTeam._id 
            }
        },
        {
            $lookup: {
                from: "feedbacks",
                localField: "_id",
                foreignField: "forMaterial",
                as: "feedbacks"
            }
        },
        {
            $addFields: {
                totalFeedbackCount: { $size: "$feedbacks" },
                fullCommunication: { $multiply: [5, { $size: "$feedbacks" }] },
                fullCollaboration: { $multiply: [5, { $size: "$feedbacks" }] },
                fullAccountability: { $multiply: [5, { $size: "$feedbacks" }] },
                totalCommunicationStars: { $sum: "$feedbacks.communication" },
                totalCollaborationStars: { $sum: "$feedbacks.collaboration" },
                totalAccountabilityStars: { $sum: "$feedbacks.accountability" }
            }
        },
        {
            $project: {
                _id: 0,
                materialId: "$_id",
                description: "$name",
                name: 1,
                totalFeedbackCount: 1,
                fullCommunication: 1,
                fullCollaboration: 1,
                fullAccountability: 1,
                totalCommunicationStars: 1,
                totalCollaborationStars: 1,
                totalAccountabilityStars: 1
            }
        }
    ]);

    const totalMaterials = await Material.countDocuments({ team: myTeam._id });
    const totalTasks = await Task.countDocuments({ team: myTeam._id });
    const totalMembers = await TeamMember.countDocuments({ team: myTeam._id, role: "member", status: "accepted" });

    return res.status(200).json(
        new ApiResponse(200, { teamFeedbacks, 
            taskFeedbacksEmotions, 
            taskStarsCount, 
            materialFeedbacksEmotions, 
            materialStarsCount,
            totalMaterials,
            totalTasks,
            totalMembers
        }, "Team Analytics fetched successfully")
    )

})


export {
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
}
