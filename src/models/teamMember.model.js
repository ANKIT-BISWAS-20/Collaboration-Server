import mongoose, {Schema} from "mongoose";

const teamMemberSchema = new Schema(
    {
        member: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        team: {
            type: Schema.Types.ObjectId,
            ref: "Team",
            required: true
        },
        role: {
            type: String, 
            required: true,
        },
        status: {
            type: String,
            default: "pending"
        }

    }, 
    {
        timestamps: true
    }
)


export const TeamMember = mongoose.model("TeamMember", teamMemberSchema)