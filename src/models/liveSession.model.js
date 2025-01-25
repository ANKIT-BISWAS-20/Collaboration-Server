import mongoose, {Schema} from "mongoose";

const liveSessionsSchema = new Schema(
    {
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        startTime: {
            type: Date,
            required: true
        },
        endTime: {
            type: Date,
            required: true
        },
        topic: {
            type: String, 
            required: true
        },
        team: {
            type: Schema.Types.ObjectId,
            ref: "Team",
            required: true
        }
    }, 
    {
        timestamps: true
    }
)


export const LiveSession = mongoose.model("LiveSession", liveSessionsSchema)