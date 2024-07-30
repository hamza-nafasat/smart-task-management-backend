import mongoose from "mongoose";
import bcrypt from "bcrypt";

const { Schema, model, models } = mongoose;

const userSchema = new Schema(
    {
        name: { type: String, required: true },
        username: { type: String, required: true, unique: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true, select: false },
        role: { type: String, enum: ["user", "admin"], default: "user" },
        position: { type: String, default: "" },
        gender: { type: String, enum: ["male", "female", "other"], required: true },
    },
    { timestamps: true }
);

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    const hash = await bcrypt.hash(this.password, 10);
    this.password = hash;
    next();
});

const User = models.User || model("User", userSchema);
export default User;
