import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User} from "../models/user.model.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { TeamMember } from "../models/teamMember.model.js";
import { Submission } from "../models/submissions.model.js";
import { Task } from "../models/task.model.js";
import { LiveSession } from "../models/liveSession.model.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";
import dotenv from "dotenv"
import { Team } from "../models/team.model.js";

dotenv.config({
    path: './.env'
})


const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}


const registerUser = asyncHandler( async (req, res) => {



    const {fullName, email, username, password, contactNo, dob, address, language, role} = req.body

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }
   

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        email, 
        password,
        username: username.toLowerCase(),
        contactNo, 
        DOB: new Date(dob), 
        address, 
        language, 
        role
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

} )



const loginUser = asyncHandler(async (req, res) =>{

    const {email, username, password} = req.body
    // console.log(email);

    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

   const isPasswordValid = await user.isPasswordCorrect(password)

   if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials")
    }

   const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )

});


const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})


const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken
    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = await jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
            
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email, username, contactNo, dob, address, language, institution, experties,role} = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const current_user = await User.findById(req.user?._id)
    if (current_user.email !== email) {

        const existedUser = await User.findOne({
            email:email
        })

        if (existedUser) {
            throw new ApiError(409, "User with email already exists")
        }
    }
    if (current_user.username !== username) {

        const existedUser = await User.findOne({
            username:username
        })

        if (existedUser) {
            throw new ApiError(409, "User with username already exists")
        }
    }


    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName, 
                email, 
                username, 
                contactNo, 
                DOB: new Date(dob), 
                address, 
                language, 
                institution, 
                experties,
                role: req.user.role
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
});

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }


    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar image updated successfully")
    )
})

const getCurrentMember = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "Student fetched successfully"
    ))
})

const getCurrentLeader = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "Leader fetched successfully"
    ))
})

const getAnalytics = asyncHandler(async(req, res) => {
    const userId = req.user._id
    const current_user = await User.findById (userId)
    if (!current_user) {
        throw new ApiError(404, "User not found")
    }
    const numberTeams = await TeamMember.countDocuments({member: userId, status: "accepted"})
    const currentDate = new Date()
    const totalAssignedTasks = await TeamMember.aggregate([
        {
            $match: {
                member: current_user._id,
                status: "accepted"
            }
        },
        {
            $lookup: {
                from: "tasks",
                localField: "team",
                foreignField: "team",
                as: "tasks"
            }
        },
        {
            $unwind: "$tasks"
        },
        {
            $count: "totalTasks"
        }
    ]);
    const totalSubmittedTasks = await Submission.countDocuments({owner: userId})
    const upcomingLiveSessionsCount = await TeamMember.aggregate([
        {
            $match: {
                member: current_user._id,
                status: "accepted"
            }
        },
        {
            $lookup: {
                from: "livesessions",
                localField: "team",
                foreignField: "team",
                as: "livesessions"
            }
        },
        {
            $unwind: "$livesessions"
        },
        {
            $match: {
                "livesessions.startTime": { $gt: new Date() }
            }
        },
        {
            $count: "upcomingSessionsCount" // Count the number of documents
        }
    ]);
    

    const task_details = await Submission.aggregate([{
        $match: {
            owner: current_user._id,
        }
    },
    {
        $project: {
            marks: 1,
            fullMarks: 1,
            createdAt: 1
        }
    }])


    let totalFullMarks = 0;
    let totalMarks = 0;

    task_details.forEach(submission => {
        if (submission.marks !== 'unmarked') {
            totalFullMarks += submission.fullMarks;
            totalMarks += parseInt(submission.marks);
        }
    });

    const accuracy = ((totalMarks / totalFullMarks) * 100).toFixed(2);

    const pendingTasks = await TeamMember.aggregate([
        {
            $match: {
                member: current_user._id,
                status: "accepted"
            }
        },
        {
            $lookup: {
                from: "tasks",
                localField: "team",
                foreignField: "team",
                as: "tasks"
            }
        },
        {
            $unwind: "$tasks"
        },
        {
            $lookup: {
                from: "submissions",
                let: { taskId: "$tasks._id", memberId: "$member" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$task", "$$taskId"] },
                                    { $eq: ["$owner", "$$memberId"] }
                                ]
                            }
                        }
                    }
                ],
                as: "submissions"
            }
        },
        {
            $group: {
                _id: "$_id",
                totalTasks: { $sum: 1 },
                totalSubmissions: { $sum: { $cond: [{ $eq: [{ $size: "$submissions" }, 0] }, 0, 1] } }
            }
        },
        {
            $project: {
                _id: 0,
                pendingAssignmentCount: { $subtract: ["$totalTasks", "$totalSubmissions"] }
            }
        }
    ]);

    return res. status(200).json(
        new ApiResponse(
            200,
            {
                numberOfTeams:numberTeams,
                assignmentsAssigned: totalAssignedTasks[0]?.totalAssignments || 0,
                assignmentsSubmitted:totalSubmittedTasks,
                upcomingLiveSessions: upcomingLiveSessionsCount[0]?.upcomingLiveSessionsCount || 0,
                assignmentGraph:task_details,
                pendingAssignments: pendingTasks[0]?.pendingTaskCount || 0,
                accuracy,
            },
            "Analytics fetched successfully"
        )
    )



    
})




export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    updateUserAvatar,
    updateAccountDetails,
    getCurrentMember,
    getCurrentLeader,
    getAnalytics
}