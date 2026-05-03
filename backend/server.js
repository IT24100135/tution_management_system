const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const courseRoutes = require('./routes/courseRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const userRoutes = require('./routes/userRoutes');
const timetableRoutes = require('./routes/timetableRoutes');
const suggestionRoutes = require('./routes/suggestionRoutes');
const leaveRequestRoutes = require('./routes/leaveRequestRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const salaryRoutes = require('./routes/salaryRoutes');
const examRoutes = require('./routes/examRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const { notFound, errorHandler } = require('./middlewares/errorMiddleware');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allows us to receive JSON data in the request body

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/suggestions', suggestionRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/salaries', salaryRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/attendance', attendanceRoutes);

// Basic route to test the server
app.get('/', (req, res) => {
  res.send('Tuition Management API is running...');
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();
