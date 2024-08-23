import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { writeFile } from "node:fs/promises";
import path, { dirname } from "node:path";
import Task from "../models/task.model.js";
import User from "../models/user.model.js";
import { fileURLToPath } from "node:url";
import { sendMailWithAttachments } from "../services/nodemailer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const userPdfPath = path.join(__dirname, `../../user-pdf`);

const isToday = (day, isReturn = false) => {
  const daysOfWeek = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const fullDaysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  if (!day || typeof day !== "string") {
    console.error("Invalid day input");
    return isReturn ? null : false;
  }

  const todayIndex = new Date().getDay();
  const dayLowerCase = day.toLowerCase().slice(0, 3);

  if (!daysOfWeek.includes(dayLowerCase)) {
    console.error("Day not recognized");
    return isReturn ? null : false;
  }

  if (isReturn) {
    return fullDaysOfWeek[daysOfWeek.indexOf(dayLowerCase)];
  }

  return daysOfWeek[todayIndex] === dayLowerCase;
};

const getRatingEmoji = (rating) => {
  switch (Number(rating)) {
    case 5:
      return "Excellent";
    case 4:
      return "Good";
    case 3:
      return "Average";
    case 2:
      return "Bad";
    case 1:
      return "Very Bad";
    default:
      return rating;
  }
};

const getStatusColor = (status) => {
  if (status === "completed") return [135, 209, 15];
  if (status === "in-progress") return [251, 158, 50];
  if (status === "scheduled") return [146, 163, 255];
  return [235, 78, 28];
};

const getUserDetailsForPdf = async (userId) => {
  const last24HoursTaskDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
  let userPromise = User.findById(userId).select("-password").populate("tasks").populate({
    path: "feedback.task",
  });
  const tasksOfUserPromise = Task.find({
    $or: [{ creator: userId }, { assignee: userId }],
    createdAt: { $gte: last24HoursTaskDate },
  }).populate({
    path: "creator",
  });
  const [user, tasksOfUser] = await Promise.all([userPromise, tasksOfUserPromise]);
  if (!user) return next(new CustomError(404, "User not found"));

  user.tasks = user.tasks?.filter((task) => {
    const taskDate = new Date(task.createdAt);
    const oneDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.round(Math.abs((taskDate - last24HoursTaskDate) / oneDay));
    return diffDays <= 1;
  });
  user.feedback = user.feedback?.filter((feed) => {
    const feedDate = new Date(feed?.task?.createdAt);
    const oneDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.round(Math.abs((feedDate - last24HoursTaskDate) / oneDay));
    return diffDays <= 1;
  });

  const modifiedTasksOfUser = tasksOfUser.map((task) => {
    return {
      ...task._doc,
      creator: task.creator?.name,
      rattingForMe:
        user?.feedback?.find((feed) => String(feed?.task?._id) === String(task?._id))?.feedback || "Not Yet",
    };
  });

  let userWithRating = {
    ...user._doc,
    tasks: modifiedTasksOfUser,
  };
  return userWithRating;
};
const downloadPDFWithSingleUserTodayReport = async (userId) => {
  const userDetails = await getUserDetailsForPdf(userId);

  // Check if the user has any tasks
  if (!userDetails.tasks || userDetails.tasks.length === 0) {
  }

  const doc = new jsPDF();
  const today = new Date().toLocaleDateString(); // Get today's date
  let yOffset = 15;

  // Add the heading "User's Today Tasks Report"
  doc.setFontSize(16);
  doc.text(`${userDetails.name}'s Today Tasks Report`, 15, yOffset);

  // Add today's date in the upper right corner
  doc.setFontSize(12);
  doc.text(`Date: ${today}`, doc.internal.pageSize.getWidth() - 15, yOffset, { align: "right" });

  yOffset += 10; // Move down the Y offset for the table

  // Prepare task data for the table
  const taskData = userDetails.tasks.map((task, index) => [
    index + 1,
    task.creator,
    task.title.toUpperCase(),
    {
      content: task.status,
      styles: {
        fillColor: getStatusColor(task.status),
        textColor: [255, 255, 255],
        halign: "center",
        valign: "middle",
      },
    },
    task.startDate != null
      ? String(task.startDate)?.split("T")?.[0]?.split("-")?.reverse()?.join("/")
      : `Start of ${isToday(task.onDay, true)}`,
    task.endDate != null
      ? String(task.endDate)?.split("T")?.[0]?.split("-")?.reverse()?.join("/")
      : `End of ${isToday(task.onDay, true)}`,
    getRatingEmoji(task.rattingForMe || 0),
  ]);

  // Add the table to the PDF
  doc.autoTable({
    head: [["#", "User", "Task", "Status", "Start Date", "End Date", "Feedback"]],
    body: taskData,
    startY: yOffset,
    styles: {
      halign: "center",
      valign: "middle",
      fontSize: 10,
      cellPadding: 3,
      lineColor: [200, 200, 200],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [33, 150, 243],
      textColor: [255, 255, 255],
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240],
    },
  });

  // Save the PDF file
  const newPdf = doc.output();
  const filePath = path.join(userPdfPath, `${userDetails.name}.pdf`);
  await writeFile(filePath, newPdf);

  return filePath;
};

const getUsersAndGenerateDateAndSendmail = async () => {
  try {
    let users = await User.find({}).select("_id name email");
    users.forEach(async (user) => {
      const savePdf = await downloadPDFWithSingleUserTodayReport(user._id);
      const attachment = [
        {
          filename: `${user.name}.pdf`,
          path: savePdf,
        },
      ];
      let isSentMail = await sendMailWithAttachments(
        user.email,
        "Daily Report",
        "This is Your Daily Report Of Task",
        attachment
      );
      if (!isSentMail) {
        console.log(`Error sending email to ${user.email}`);
      } else {
        console.log(`Email sent to ${user.email}`);
      }
    });
  } catch (error) {
    console.log("Error in getUsersAndGenerateDateAndSendmail", error);
  }
};
export default getUsersAndGenerateDateAndSendmail;
