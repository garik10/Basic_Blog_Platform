
import mongoose from "mongoose";

// Connect to MongoDB
const connect = mongoose.connect("mongodb://localhost:27017/Users_pass&name");

connect
  .then(() => {
    console.log("Database connected successfully");
  })
  .catch(() => {
    console.log("Database connection failed");
  });

// Define post schema
const postSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  comments: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
      },
      text: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

// Define login schema
const loginSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    
  },
  password: {
    type: String,
    required: true,
  },
});

// Create models for posts and users
export const PostModel = mongoose.model("posts", postSchema);
export const UserModel = mongoose.model("users", loginSchema);
