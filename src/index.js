

import express from "express";
import bcrypt from "bcrypt";
import { UserModel, PostModel } from "./config.js";
import session from "express-session";

const app = express();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: true,
  })
);

// Home route - renders the home page with posts and user information
app.get("/", (req, res) => {
  res.render("login");
});

// Home route - renders the home page with posts and user information
app.get("/home", async (req, res) => {
  try {
    if (!req.session.userId) {
      res.redirect("/");
      return;
    }

    const user = await UserModel.findOne({ _id: req.session.userId });

    if (!user) {
      res.send("User not found");
      return;
    }

    // Fetch posts and populate user information
    const posts = await PostModel.find({}).populate({
      path: "userId",
      model: "users",
    }).populate({
      path: "comments.userId",
      model: "users",
    });

    res.render("home", { user, posts });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.send("Error fetching data");
  }
});

// Signup route - renders the signup page
app.get("/signup", (req, res) => {
  res.render("signup");
});

// Add post route - handles the addition of a new post
app.post("/addpost", async (req, res) => {
  try {
    const postData = {
      title: req.body.post,
      userId: req.session.userId,
    };

    // Save the post data to the 'user_posts' collection in the database
    const savedPost = await PostModel.create(postData);

    console.log("Post saved successfully:", savedPost);

    // Redirect to home page after adding post
    res.redirect("/home");
  } catch (error) {
    console.error("Error saving post:", error);
    res.send("Error saving post");
  }
});

// Signup route - handles user registration
app.post("/signup", async (req, res) => {
  const data = {
    name: req.body.username,
    password: req.body.password,
  };

  try {
    const existingUser = await UserModel.findOne({ name: data.name });

    if (existingUser) {
      res.send("User already exists. Please choose a different username.");
    } else {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(data.password, saltRounds);

      // Insert the new user into the database
      const newUser = await UserModel.create({
        name: data.name,
        password: hashedPassword,
      });

      console.log("User registered successfully:", newUser);
    }
  } catch (error) {
    console.error("Error registering user:", error);
    res.send("Error registering user");
  }

  res.redirect("/signup");
});

// Login route - handles user login
app.post("/home", async (req, res) => {
  try {
    const check = await UserModel.findOne({ name: req.body.username });
    if (!check) {
      res.send("Username not found");
      return;
    }

    // Compare the hashed password from the database with the plain text
    const isPasswordMatch = await bcrypt.compare(
      req.body.password,
      check.password
    );
    if (isPasswordMatch) {
      req.session.userId = check._id;
      res.redirect("home");
    } else {
      res.send("Wrong password");
    }
  } catch {
    res.send("Error validating login details");
  }
});

// Delete post route - handles the deletion of a post
app.post("/deletepost/:postId", async (req, res) => {
  try {
    const postId = req.params.postId;
    // Check if the user is the owner of the post before deleting
    const deletedPost = await PostModel.deleteOne({
      _id: postId,
      userId: req.session.userId,
    });
    if (deletedPost.deletedCount === 1) {
      console.log("Post deleted successfully");
    } else {
      console.log(
        "Post not found or user does not have permission to delete"
      );
    }
    res.redirect("/home");
  } catch (error) {
    console.error("Error deleting post:", error);
    res.send("Error deleting post");
  }
});

// Update post route - renders the update form for a post
app.get("/updatepost/:postId", async (req, res) => {
  try {
    const postId = req.params.postId;
    const post = await PostModel.findById(postId);

    if (!post) {
      res.send("Post not found");
      return;
    }

    // Check if the logged-in user is the author of the post
    if (post.userId.toString() !== req.session.userId) {
      res.send("You don't have permission to update this post");
      return;
    }

    res.render("update", { post });
  } catch (error) {
    console.error("Error updating post:", error);
    res.send("Error updating post");
  }
});

// Update post route - handles the update of a post
app.post("/updatepost/:postId", async (req, res) => {
  try {
    const postId = req.params.postId;
    const updatedTitle = req.body.updatedTitle;

    // Update the post title only if the logged-in user is the author
    const updatedPost = await PostModel.findOneAndUpdate(
      { _id: postId, userId: req.session.userId },
      { title: updatedTitle },
      { new: true }
    );

    if (!updatedPost) {
      res.send("Post not found or you don't have permission to update");
      return;
    }

    res.redirect("/home");
  } catch (error) {
    console.error("Error updating post:", error);
    res.send("Error updating post");
  }
});

// Add Comment route - handles the addition of a comment to a post
app.post("/addcomment/:postId", async (req, res) => {
  try {
    const postId = req.params.postId;
    const commentText = req.body.comment;

    // Save the comment data to the post's comments array
    const updatedPost = await PostModel.findOneAndUpdate(
      { _id: postId },
      { $push: { comments: { userId: req.session.userId, text: commentText } } },
      { new: true }
    );

    if (!updatedPost) {
      res.send("Post not found");
      return;
    }

    res.redirect("/home");
  } catch (error) {
    console.error("Error adding comment:", error);
    res.send("Error adding comment");
  }
});

// Delete Comment route - handles the deletion of a comment from a post
app.post("/deletecomment/:postId/:commentId", async (req, res) => {
  try {
    const postId = req.params.postId;
    const commentId = req.params.commentId;

    // Remove the comment from the post's comments array
    const updatedPost = await PostModel.findOneAndUpdate(
      { _id: postId },
      { $pull: { comments: { _id: commentId, userId: req.session.userId } } },
      { new: true }
    );

    if (!updatedPost) {
      res.send(
        "Post not found or you don't have permission to delete the comment"
      );
      return;
    }

    res.redirect("/home");
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.send("Error deleting comment");
  }
});
// Add a new route to render the password change form
app.get("/changepassword", (req, res) => {
  res.render("changepassword");
});

// Add a new route to handle password change requests
app.post("/changepassword", async (req, res) => {
  try {
    const user = await UserModel.findOne({ _id: req.session.userId });

    if (!user) {
      res.send("User not found");
      return;
    }

    // Check the current password before allowing a change
    const isPasswordMatch = await bcrypt.compare(
      req.body.currentPassword,
      user.password
    );

    if (isPasswordMatch) {
      // Hash the new password and update it in the database
      const newHashedPassword = await bcrypt.hash(req.body.newPassword, 10);
      user.password = newHashedPassword;
      await user.save();

      res.redirect("/home");
    } else {
      res.send("Current password is incorrect");
    }
  } catch (error) {
    console.error("Error changing password:", error);
    res.send("Error changing password");
  }
});


// Start the server
const port = 3001;
app.listen(port, () => {
  console.log(`Server running on Port: ${port}`);
});
