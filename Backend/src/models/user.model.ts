import { model, Schema } from "mongoose";

interface User {
  name: string;
  email: string;
  passwordHash: string;
  role: "EMPLOYEE" | "ADMIN";
  annualLeaveBalance: number;
}

export const USER_ROLES = ["EMPLOYEE", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

const userSchema = new Schema<User>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ['EMPLOYEE', 'ADMIN'],
      default: 'EMPLOYEE',
      required: true,
    },

    annualLeaveBalance: {
      type: Number,
      default: 20,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const userModel = model<User>("User", userSchema);

export { userSchema, userModel };
