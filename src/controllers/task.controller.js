import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User} from "../models/user.model.js"
import { Team } from "../models/team.model.js";
import { Task } from "../models/task.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Submission } from "../models/submissions.model.js";
import { Feedback } from "../models/feedback.model.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";
import dotenv from "dotenv"
import { TeamMember } from "../models/teamMember.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import axios from "axios"

dotenv.config({
    path: './.env'
})




const createTask = asyncHandler( async (req, res) => {
    const teamId = req.query.teamId
    const userId = req.user._id

    const current_user = await User.findById(userId)
    const current_team= await Team.findById(teamId)
    if (current_team.leader.toString() !== current_user._id.toString()) {
 
        throw new ApiError(400, "You are not leader of this team")
    }

    const {description,deadline} = req.body
    if (
        [userId, deadline, teamId, description].some((field) => field === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }


    const documentLocalPath = req.files?.file[0]?.path;

    if (!documentLocalPath) {
        throw new ApiError(400, " file is required")
    }

    const doc = await uploadOnCloudinary(documentLocalPath)
    if (!doc) {
        throw new ApiError(400, " file is required")
    }
   
    const deadlineDate = new Date(deadline)
    const myTask = await Task.create({
        team: teamId,
        document: doc.url,
        deadline:deadlineDate, 
        description:description,
        owner: current_user._id,
        fullmarks:100,
    })

    const createdTask = await Task.findById(myTask._id)

    if (!createdTask) {
        throw new ApiError(500, "Something went wrong while creating the task")
    }

    return res.status(201).json(
        new ApiResponse(200, {user: current_user,
            createdTask:createdTask,
        }, "Task Added Successfully")
    )
})


const deleteTask = asyncHandler( async (req, res) => {
    const teamId = req.query.teamId
    const taskId = req.query.taskId
    const userId = req.user._id

    const task = await Task.findById(taskId)
    if (!task) {
        throw new ApiError(400, "Task not found")
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

    await Task.findByIdAndDelete(taskId)

    return res.status(200).json(
        new ApiResponse(200, {}, "Task Deleted Successfully")
    )
})


const getAllTask = asyncHandler( async (req, res) => {
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

    const tasks = await Task.aggregate([
        {
              "$match": {
                  "team": current_team._id
              }
          },
          {
              "$sort": {
                  "createdAt": 1
              }
          },
          {
              "$lookup": {
                  "from": "submissions",
                  "let": { "taskId": "$_id" },
                  "pipeline": [
                      {
                          "$match": {
                              "$expr": { "$and": [
                                  { "$eq": ["$task", "$$taskId"] },
                                  { "$eq": ["$owner", current_user._id] }
                              ]}
                          }
                      }
                  ],
                  "as": "submissions"
              }
          },
          {
              "$addFields": {
                  "marks": {
                      "$ifNull": [{ "$arrayElemAt": ["$submissions.marks", 0] }, null]
                  }
              }
          }
      ])

    return res.status(200).json(
        new ApiResponse(200,  tasks, "Tasks Fetched Successfully")
    )
})

const giveTaskFeedback = asyncHandler( async (req, res) => {
    const taskId = req.query.taskId
    const userId = req.user._id

    const task = await Task.findById(taskId)
    if (!task) {
        throw new ApiError(400, "Task not found")
    }

    const isTeamMember = await TeamMember.findOne({
        member: userId,
        team: task.team,
        status: "accepted"
    })

    if (!isTeamMember) {
        throw new ApiError(400, "You are not member of this team")
    }

    const {communication, collaboration, accountability,text} = req.body
    

    if (
        [communication, collaboration, accountability,text].some((field) => field === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const isFeedbackGiven = await Feedback.findOne({
        provider: userId,
        type: "task",
        forTask: taskId
    })

    if (isFeedbackGiven) {
        throw new ApiError(409, "Feedback already given")
    }

    //TODO: emotion calculation
    let emotion;
    if (text.includes("good")) {
        emotion = "POSITIVE";
    } else if (text.includes("bad")) {
        emotion = "NEGATIVE";
    }

    const feedback = await Feedback.create({
        provider: userId,
        type: "task",
        text: text,
        emotion: emotion,
        communication: communication,
        collaboration: collaboration,
        accountability: accountability,
        forTask: taskId
    })

    return res.status(201).json(
        new ApiResponse(201, feedback, "Feedback Added Successfully")
    )

})


export {
    createTask,
    deleteTask,
    getAllTask,
    giveTaskFeedback
}