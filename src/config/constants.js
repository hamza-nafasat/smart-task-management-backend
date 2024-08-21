import { io } from "../app.js";

const returnWelcomeMessage = (name, frontendUrl) => {
  const userWelcomePage = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Welcome to Smart Task</title>
      <style>
        body {
          background-color: #e0f7fa;
          font-family: "Segoe UI", sans-serif;
          margin: 0;
          padding: 0;
        }
  
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 10px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          animation: fadeIn 1.5s ease-in-out;
        }
  
        .header {
          background-color: #00796b;
          color: #ffffff;
          text-align: center;
          padding: 20px;
        }
  
        .header img {
          width: 100px;
          height: auto;
        }
  
        .header h1 {
          margin: 10px 0 0 0;
          font-size: 2.5em;
        }
  
        .content {
          padding: 20px;
          text-align: center;
        }
  
        .content h2 {
          color: #00796b;
          font-size: 1.8em;
          margin-bottom: 20px;
          animation: fadeInDown 1s ease-in-out;
        }
  
        .content p {
          color: #004d40;
          font-size: 1.2em;
          line-height: 1.6;
          margin: 10px 0;
          animation: fadeInUp 1s ease-in-out;
        }
  
        .cta-button {
          display: inline-block;
          background-color: #009688;
          color: #ffffff;
          padding: 12px 30px;
          margin: 20px 0;
          text-decoration: none;
          border-radius: 50px;
          font-size: 1.2em;
          cursor: pointer;
          transition: background-color 0.3s ease, transform 0.3s ease;
          animation: pulse 2s infinite;
        }
  
        .cta-button:hover {
          background-color: #00796b;
          transform: translateY(-3px);
        }
  
        .footer {
          background-color: #e0f7fa;
          color: #004d40;
          text-align: center;
          padding: 15px;
          font-size: 0.9em;
        }
  
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
  
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
  
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
  
        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Welcome Aboard!</h1>
        </div>
        <div class="content">
          <h2>You're now part of the Smart Task family!</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>
            We're thrilled to have you on board! Smart Task is here to help you manage your tasks, collaborate
            with your team, and achieve more every day.
          </p>
          <p>
            Get started by exploring the app and setting up your first tasks. We're here to support you every
            step of the way.
          </p>
          <a href="${frontendUrl}" class="cta-button">Log in to Smart Task</a>
        </div>
        <div class="footer">
          <p>&copy; 2024 Smart Task. All rights reserved.</p>
        </div>
      </div>
    </body>
  </html>`;

  return userWelcomePage;
};

const liveSockets = new Map();

const socketEvent = {
  SEND_NOTIFICATION: "SEND_NOTIFICATION",
};

const emitEvent = async (event, user, data) => {
  const socketUser = await liveSockets.get(String(user));
  io.to(socketUser).emit(event, data);
};

export { returnWelcomeMessage, liveSockets, socketEvent, emitEvent };
