import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { Task } from "../models/task.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Team } from "../models/team.model.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";
import dotenv from "dotenv"
import { TeamMember } from "../models/teamMember.model.js";
import { Submission } from "../models/submissions.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

dotenv.config({
    path: './.env'
})




const submitTask = asyncHandler(async (req, res) => {
    const taskId = req.query.taskId
    const userId = req.user._id
    const current_user = await User.findById(userId)
    const submission = await Submission.findOne(
        { task: taskId, owner: userId }
    )
    if (submission) {
        throw new ApiError(409, "You have already submitted this task")
    }

    const { description } = req.body
    if (
        [userId, taskId, description].some((field) => field === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const task = await Task.findById(taskId)


    const documentLocalPath = req.files?.document[0]?.path;
    if (!documentLocalPath) {
        throw new ApiError(400, " file is required")
    }

    const doc = await uploadOnCloudinary(documentLocalPath)
    if (!doc) {
        throw new ApiError(400, " file is required")
    }


    const mySubmission = await Submission.create({
        task: task._id,
        fullMarks:task.fullmarks,
        document: doc.url,
        description: description,
        owner: current_user._id,
    })

    const createdSubmission = await Submission.findById(mySubmission._id)

    if (!createdSubmission) {
        throw new ApiError(500, "Something went wrong while creating the submission")
    }

    return res.status(201).json(
        new ApiResponse(200, {
            user: current_user,
            createdSubmission: createdSubmission,
        }, "Submission Added Successfully")
    )
})


const viewSubmission = asyncHandler(async (req, res) => {
    const taskId = req.query.taskId
    const userId = req.user._id

    const submission = await Submission.findOne(
        { task: taskId, owner: userId }
    )

    return res.status(200).json(
        new ApiResponse(200, submission, "Submission Found")
    )
})


// leader routes

const viewAllSubmissions = asyncHandler(async (req, res) => {
    const taskId = req.query.taskId
    const userId = req.user._id

    const task = await Task.findById(
        taskId
    )

    const team_found = await Team.findById(task.team)
    if (team_found.leader.toString() != userId.toString()) {
        throw new ApiError(400, "You are not leader of this team")
    }

    if (!task) {
        throw new ApiError(400, "Task not found")
    }

    const submissions = await Submission.aggregate([
        {
            $match: {
                task: task._id
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $unwind: "$owner"
        },
        {
            $project: {
                "owner.password": 0,
                "owner.email": 0,
                "owner.createdAt": 0,
                "owner.updatedAt": 0,
                "owner.__v": 0
            }
        }
    ])
    return res.status(200).json(
        new ApiResponse(200, submissions, "Submissions Found")
    )
})

const markSubmission = asyncHandler(async (req, res) => {
    const submissionId = req.query.submissionId
    const userId = req.user._id


    const submission = await Submission.findById(
        submissionId
    )

    const task = await Task.findById(
        submission.task
    )

    const task_found = await Team.findById(task.team)
    if (task_found.leader.toString() != userId.toString()) {
        throw new ApiError(400, "You are not leader of this team")
    }

    if (!submission) {
        throw new ApiError(400, "Submission not found")
    }

    const { marks } = req.body
    if (
        [marks].some((field) => field === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    if (marks > task.fullmarks) {
        throw new ApiError(400, "Marks cannot be greater than fullmarks")
    }

    submission.marks = marks
    await submission.save()
    const updatedSubmission = await Submission.findById(submissionId)

    return res.status(200).json(
        new ApiResponse(200, { updatedSubmission }, "Submission Marked")
    )
})







export {
    submitTask,
    viewSubmission,
    viewAllSubmissions,
    markSubmission
}