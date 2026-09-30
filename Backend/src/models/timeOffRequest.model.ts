import mongoose from "mongoose";

const timeOffRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },

    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },

    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },

    argency: {
      type: String,
      enum: ["normal", "urgent"],
      default: "normal",
    },

    reason: {
      type: String,
      required: [true, "Reason is required"],
      trim: true,
      minlength: [3, "Reason must be at least 3 characters long"],
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    days: {
      type: Number,
      required: [true, "Number of leave days is required"],
      min: [1, "Leave request must contain at least 1 leave day (Sunday does not count)"],
    },
  },
  {
    timestamps: true,
  }
);

const timeOffRequestModel = mongoose.model(
  "TimeOffRequest",
  timeOffRequestSchema
);

export { timeOffRequestSchema, timeOffRequestModel };