import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Employee name is required"],
      minlength: [3, "Employee name must be at least 3 characters long"],
      trim: true,
    },

    annualLeaveBalance: {
      type: Number,
      required: true,
      default: 20,
      min: [0, "Leave balance cannot be negative"],
    },
  },
  {
    timestamps: true,
  }
);

const employeeModel = mongoose.model("Employee", employeeSchema);

export { employeeSchema, employeeModel };