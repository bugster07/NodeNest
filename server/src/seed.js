
import "dotenv/config";
import mongoose from "mongoose";
import User from "./models/User.js";
import Note from "./models/Note.js";

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const email = "demo@notenest.com";

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name: "Demo User",
        email,
        password: "DemoPass123!",
      });
    }

    const existingNote = await Note.findOne({
      owner: user._id,
      title: "Introduction to JavaScript",
    });

    if (!existingNote) {
      await Note.create({
        title: "Introduction to JavaScript",
        content:
          "JavaScript is a programming language used to create dynamic and interactive web applications. It supports variables, functions, objects, arrays, promises, and asynchronous programming. Node.js allows JavaScript to run on the server.",
        tags: ["JavaScript", "Programming"],
        sourceType: "text",
        owner: user._id,
      });
    }

    console.log("Seed completed successfully!");
    console.log("Demo email:", email);
    console.log("Demo password: DemoPass123!");
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedDatabase();
