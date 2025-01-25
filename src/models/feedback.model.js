import mongoose, {Schema} from "mongoose";

const feedbackSchema = new Schema(
    {
        provider: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        type: {
            type: String,
            required: true
        },
        text: {
            type: String, 
        },
        communication: {
            type: Number, 
            default: 0
        },
        collaboration: {
            type: Number, 
            default: 0
        },
        accountability: {
            type: Number, 
            default: 0
        },
        emotion: {
            type: String, 
        },
        forTeam:{
            type: Schema.Types.ObjectId,
            ref: "Team",
        },
        forTask:{
            type: Schema.Types.ObjectId,
            ref: "Task",
        },
        forMaterial:{
            type: Schema.Types.ObjectId,
            ref: "Material",
        },
        forMember:{
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    }, 
    {
        timestamps: true
    }
)


export const Feedback = mongoose.model("Feedback", feedbackSchema)