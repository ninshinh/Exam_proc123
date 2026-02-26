-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 19, 2026 at 01:55 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `cec_exam_system`
--

-- --------------------------------------------------------

--
-- Table structure for table `administrators`
--

CREATE TABLE `administrators` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('super_admin','admin') DEFAULT 'admin',
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `administrators`
--

INSERT INTO `administrators` (`id`, `name`, `email`, `password_hash`, `role`, `status`, `created_at`, `updated_at`) VALUES
(1, 'System Administrator', 'admin@itproctool.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin', 'active', '2025-09-25 03:28:10', '2025-09-25 03:28:10'),
(2, 'IT Admin', 'it.admin@itproctool.edu', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'active', '2025-09-25 03:28:10', '2025-09-25 03:28:10');

-- --------------------------------------------------------

--
-- Table structure for table `exams`
--

CREATE TABLE `exams` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `form_url` text NOT NULL,
  `duration_minutes` int(11) DEFAULT 60,
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  `teacher_id` int(11) NOT NULL,
  `unique_id` varchar(20) NOT NULL,
  `status` enum('draft','active','completed','cancelled') DEFAULT 'draft',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `exams`
--

INSERT INTO `exams` (`id`, `title`, `description`, `form_url`, `duration_minutes`, `start_time`, `end_time`, `teacher_id`, `unique_id`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Database Systems Midterm', 'Midterm examination covering database design and SQL', 'https://forms.google.com/sample1', 120, NULL, NULL, 1, 'EXAM001', 'completed', '2025-09-25 03:28:10', '2025-09-25 03:31:20'),
(2, 'Programming Fundamentals Quiz', 'Weekly quiz on programming concepts', 'https://forms.google.com/sample2', 60, NULL, NULL, 2, 'EXAM002', 'draft', '2025-09-25 03:28:10', '2025-09-25 03:28:10'),
(3, 'Data Structures Final', 'Final examination on data structures and algorithms', 'https://forms.google.com/sample3', 180, NULL, NULL, 3, 'EXAM003', 'completed', '2025-09-25 03:28:10', '2025-09-25 03:28:10'),
(4, 'survey', 'asd', 'https://docs.google.com/forms/d/e/1FAIpQLSfheAWc2_SwzseI0X0T6CQIzeDkQdwJwN4OsM9031-3DINoPA/viewform?usp=dialog', 60, '2025-09-25 16:31:00', '2025-09-26 09:36:00', 1, 'SURV065932', 'active', '2025-09-25 03:31:05', '2026-02-11 17:36:38'),
(5, 'surv', 'asd', 'https://docs.google.com/forms/d/e/1FAIpQLSfheAWc2_SwzseI0X0T6CQIzeDkQdwJwN4OsM9031-3DINoPA/viewform?usp=sharing&ouid=107307339841859274185', 6, '2026-02-02 16:30:00', '2026-02-02 17:27:00', 5, 'SURV713865', 'active', '2026-02-02 16:28:33', '2026-02-02 16:28:46'),
(6, 'asdasd', 'asdasd', 'http://localhost:3000/index.html', 60, '2026-02-12 18:38:00', '2026-02-12 19:35:00', 1, 'ASDA356758', 'draft', '2026-02-12 18:35:56', '2026-02-12 18:35:56');

-- --------------------------------------------------------

--
-- Table structure for table `exam_sessions`
--

CREATE TABLE `exam_sessions` (
  `id` int(11) NOT NULL,
  `exam_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `session_token` varchar(255) DEFAULT NULL,
  `start_time` timestamp NOT NULL DEFAULT current_timestamp(),
  `end_time` timestamp NULL DEFAULT NULL,
  `status` enum('active','completed','terminated') DEFAULT 'active',
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `exam_sessions`
--

INSERT INTO `exam_sessions` (`id`, `exam_id`, `student_id`, `session_token`, `start_time`, `end_time`, `status`, `ip_address`, `user_agent`, `created_at`) VALUES
(37, 4, 1, '4-1-1771479504366', '2026-02-19 05:38:24', NULL, 'active', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-19 05:38:24');

-- --------------------------------------------------------

--
-- Table structure for table `proctoring_settings`
--

CREATE TABLE `proctoring_settings` (
  `id` int(11) NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `description` text DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `proctoring_settings`
--

INSERT INTO `proctoring_settings` (`id`, `setting_key`, `setting_value`, `description`, `updated_by`, `updated_at`) VALUES
(1, 'violation_threshold', '5', 'Maximum violations before automatic termination', NULL, '2026-02-01 11:25:37'),
(2, 'tab_switch_enabled', 'true', 'Enable tab switching detection', NULL, '2025-09-25 03:28:10'),
(3, 'right_click_disabled', 'true', 'Disable right-click during exams', NULL, '2025-09-25 03:28:10'),
(4, 'copy_paste_disabled', 'true', 'Disable copy-paste during exams', NULL, '2025-09-25 03:28:10'),
(5, 'fullscreen_required', 'true', 'Require fullscreen mode during exams', NULL, '2025-09-25 03:28:10');

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `student_id` varchar(50) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `department` varchar(255) DEFAULT NULL,
  `year_level` int(11) DEFAULT NULL,
  `status` enum('active','inactive','graduated') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `teacher_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`id`, `name`, `student_id`, `email`, `department`, `year_level`, `status`, `created_at`, `updated_at`, `teacher_id`) VALUES
(1, 'Alice Johnson', 'STU001', 'alice.johnson@student.cec.edu', 'Computer Science', 3, 'active', '2025-09-25 03:28:10', '2026-02-02 15:52:28', 1),
(2, 'Bob Wilson', 'STU002', 'bob.wilson@student.cec.edu', 'Information Technology', 2, 'active', '2025-09-25 03:28:10', '2026-02-02 15:52:47', 5),
(3, 'Carol Davis', 'STU003', 'carol.davis@student.cec.edu', 'Computer Science', 4, 'active', '2025-09-25 03:28:10', '2025-09-25 03:28:10', 0),
(4, 'David Brown', 'STU004', 'david.brown@student.cec.edu', 'Information Technology', 1, 'active', '2025-09-25 03:28:10', '2025-09-25 03:28:10', 0),
(5, 'Eva Martinez', 'STU005', 'eva.martinez@student.cec.edu', 'Computer Science', 3, 'active', '2025-09-25 03:28:10', '2025-09-25 03:28:10', 0),
(6, 'Frank Taylor', 'STU006', 'frank.taylor@student.cec.edu', 'Computer Engineering', 2, 'active', '2025-09-25 03:28:10', '2025-09-25 03:28:10', 0),
(7, 'Grace Lee', 'STU007', 'grace.lee@student.cec.edu', 'Software Engineering', 4, 'active', '2025-09-25 03:28:10', '2025-09-25 03:28:10', 0),
(8, 'Henry Chen', 'STU008', 'henry.chen@student.cec.edu', 'Information Technology', 3, 'active', '2025-09-25 03:28:10', '2025-09-25 03:28:10', 0),
(9, 'Ivy Rodriguez', 'STU009', 'ivy.rodriguez@student.cec.edu', 'Computer Science', 1, 'active', '2025-09-25 03:28:10', '2025-09-25 03:28:10', 0),
(10, 'Jack Thompson', 'STU010', 'jack.thompson@student.cec.edu', 'Computer Engineering', 2, 'active', '2025-09-25 03:28:10', '2025-09-25 03:28:10', 0),
(11, 'ss', 'STU011', 's@mail.com', 'General', 1, 'active', '2026-02-04 06:26:06', '2026-02-04 06:26:06', 1);

-- --------------------------------------------------------

--
-- Table structure for table `system_logs`
--

CREATE TABLE `system_logs` (
  `id` int(11) NOT NULL,
  `user_type` enum('admin','teacher','student') NOT NULL,
  `user_id` int(11) NOT NULL,
  `action` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `system_logs`
--

INSERT INTO `system_logs` (`id`, `user_type`, `user_id`, `action`, `description`, `ip_address`, `user_agent`, `timestamp`) VALUES
(1, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2025-09-25 03:29:21'),
(2, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2025-09-25 03:29:37'),
(3, 'admin', 1, 'login', 'Admin login: admin@itproctool.edu', '::1', NULL, '2025-09-25 03:41:10'),
(4, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2025-09-25 03:45:06'),
(5, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2025-09-25 06:18:32'),
(6, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2025-09-25 06:43:56'),
(7, 'admin', 1, 'login', 'Admin login: admin@itproctool.edu', '::1', NULL, '2025-09-25 06:48:22'),
(8, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-01-21 13:53:31'),
(9, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-01-21 13:54:13'),
(10, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-01-21 13:59:00'),
(11, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-01-21 14:00:23'),
(12, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-01-21 14:00:37'),
(13, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-01-21 14:02:04'),
(14, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-01-21 14:03:37'),
(15, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-01-21 14:04:01'),
(16, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-01-21 14:04:11'),
(17, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-01-21 14:32:54'),
(18, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-01-21 14:36:14'),
(19, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-01-21 14:38:27'),
(20, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-01-21 14:48:08'),
(21, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-01-21 14:48:35'),
(22, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-01-21 15:03:55'),
(23, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-01-21 15:04:17'),
(24, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-01-21 15:05:24'),
(25, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-01-21 15:10:56'),
(26, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-01-21 15:24:49'),
(27, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-01-21 15:25:19'),
(28, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-01-21 15:37:29'),
(29, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-01-21 15:38:02'),
(30, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-01-26 08:00:43'),
(31, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-01-26 08:01:15'),
(32, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-01-27 15:06:43'),
(33, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-01-27 15:06:59'),
(34, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-01-27 15:21:30'),
(35, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-01-27 15:25:07'),
(36, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-01-27 15:28:02'),
(37, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-01-27 15:44:18'),
(38, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-01-27 15:47:14'),
(39, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-01-27 15:47:55'),
(40, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-01-27 15:51:25'),
(41, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-01-27 15:57:35'),
(42, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-01-27 16:21:50'),
(43, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-02-01 11:19:58'),
(44, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-02-01 11:21:01'),
(45, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-02-01 11:44:32'),
(46, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-02-01 11:57:32'),
(47, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-02-01 12:05:52'),
(48, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-02-01 12:06:55'),
(49, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-02-01 12:21:57'),
(50, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-02-02 15:25:16'),
(51, 'admin', 1, 'login', 'Admin login: admin@itproctool.edu', '::1', NULL, '2026-02-02 15:39:32'),
(52, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-02-02 15:42:36'),
(53, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-02-02 16:03:05'),
(54, 'teacher', 5, 'login', 'Teacher login: robert.wilson@cec.edu', '::1', NULL, '2026-02-02 16:21:07'),
(55, 'student', 2, 'login', 'Student login: STU002', '::1', NULL, '2026-02-02 16:26:46'),
(56, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-02-02 16:28:54'),
(57, 'teacher', 5, 'login', 'Teacher login: robert.wilson@cec.edu', '::1', NULL, '2026-02-02 16:29:21'),
(58, 'student', 2, 'login', 'Student login: STU002', '::1', NULL, '2026-02-02 16:30:06'),
(59, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-02-02 16:30:34'),
(60, 'teacher', 5, 'login', 'Teacher login: robert.wilson@cec.edu', '::1', NULL, '2026-02-02 16:31:11'),
(61, 'student', 3, 'login', 'Student login: STU003', '::1', NULL, '2026-02-02 16:31:38'),
(62, 'teacher', 5, 'login', 'Teacher login: robert.wilson@cec.edu', '::1', NULL, '2026-02-02 16:33:10'),
(63, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-02-04 06:23:41'),
(64, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-02-04 06:52:32'),
(65, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-02-04 06:58:44'),
(66, 'student', 1, 'exam_access', 'Accessing exam: SURV065932', '::1', NULL, '2026-02-10 11:56:11'),
(67, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-02-10 11:56:47'),
(68, 'student', 1, 'exam_access', 'Accessing exam: SURV065932', '::1', NULL, '2026-02-10 12:04:46'),
(69, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-02-10 13:15:22'),
(70, 'student', 1, 'exam_access', 'Accessing exam: SURV065932', '::1', NULL, '2026-02-10 13:20:20'),
(71, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-02-10 13:38:51'),
(72, 'student', 1, 'exam_access', 'Accessing exam: SURV065932', '::1', NULL, '2026-02-10 13:39:38'),
(73, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-02-10 13:39:54'),
(74, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-02-10 14:41:12'),
(75, 'student', 1, 'exam_access', 'Accessing exam: SURV065932', '::1', NULL, '2026-02-10 16:44:22'),
(76, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-02-10 16:52:29'),
(77, 'student', 1, 'exam_access', 'Accessing exam: SURV065932', '::1', NULL, '2026-02-10 17:42:44'),
(78, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-02-10 18:38:09'),
(79, 'student', 1, 'exam_access', 'Accessing exam: SURV065932', '::1', NULL, '2026-02-10 18:38:25'),
(80, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-02-10 18:39:58'),
(81, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-02-11 07:27:27'),
(82, 'student', 1, 'exam_access', 'Accessing exam: SURV065932', '::1', NULL, '2026-02-11 07:27:55'),
(83, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-02-11 07:28:19'),
(84, 'student', 1, 'exam_access', 'Accessing exam: SURV065932', '::1', NULL, '2026-02-11 07:56:38'),
(85, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-02-11 07:56:53'),
(86, 'student', 1, 'exam_access', 'Accessing exam: SURV065932', '::1', NULL, '2026-02-11 15:19:47'),
(87, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-02-11 15:27:13'),
(88, 'teacher', 3, 'login', 'Teacher login: michael.brown@cec.edu', '::1', NULL, '2026-02-12 03:15:10'),
(89, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-02-12 03:27:19'),
(90, 'student', 1, 'exam_access', 'Accessing exam: SURV065932', '::1', NULL, '2026-02-12 15:01:41'),
(91, 'student', 1, 'exam_access', 'Accessing exam: SURV065932', '::1', NULL, '2026-02-12 15:02:36'),
(92, 'student', 1, 'exam_access', 'Accessing exam: SURV065932', '::1', NULL, '2026-02-12 15:03:16'),
(93, 'student', 1, 'exam_access', 'Accessing exam: SURV065932', '::1', NULL, '2026-02-12 16:50:04'),
(94, 'student', 1, 'exam_access', 'Accessing exam: SURV065932', '::1', NULL, '2026-02-12 17:32:11'),
(95, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-02-12 18:35:09'),
(96, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-02-19 05:38:11'),
(97, 'student', 1, 'login', 'Student login: STU001', '::1', NULL, '2026-02-19 05:38:24'),
(98, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-02-19 05:56:56'),
(99, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-02-19 10:29:17'),
(100, 'teacher', 1, 'login', 'Teacher login: TEACHER@CEC.EDU', '::1', NULL, '2026-02-19 11:20:47'),
(101, 'teacher', 1, 'login', 'Teacher login: teacher@cec.edu', '::1', NULL, '2026-02-19 12:14:45');

-- --------------------------------------------------------

--
-- Table structure for table `teachers`
--

CREATE TABLE `teachers` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `department` varchar(255) DEFAULT NULL,
  `employee_id` varchar(50) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `teachers`
--

INSERT INTO `teachers` (`id`, `name`, `email`, `password_hash`, `department`, `employee_id`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Dr. John Smith', 'teacher@cec.edu', 'teacher123', 'Computer Science', 'EMP001', 'active', '2025-09-25 03:28:10', '2025-09-25 03:28:10'),
(2, 'Prof. Sarah Johnson', 'sarah.johnson@cec.edu', 'password123', 'Information Technology', 'EMP002', 'active', '2025-09-25 03:28:10', '2025-09-25 03:28:10'),
(3, 'Dr. Michael Brown', 'michael.brown@cec.edu', 'password123', 'Computer Engineering', 'EMP003', 'active', '2025-09-25 03:28:10', '2025-09-25 03:28:10'),
(4, 'Prof. Lisa Davis', 'lisa.davis@cec.edu', 'password123', 'Software Engineering', 'EMP004', 'active', '2025-09-25 03:28:10', '2025-09-25 03:28:10'),
(5, 'Dr. Robert Wilson', 'robert.wilson@cec.edu', 'password123', 'Computer Science', 'EMP005', 'active', '2025-09-25 03:28:10', '2025-09-25 03:28:10');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('student','teacher','staff','admin') NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `role`, `name`, `created_at`) VALUES
(1, 'student1', '$2y$10$XspEZoJnCf1RYMio1Ygg2uB23Nja4mrSfRgX9QjDND.CbrZuQFEcG', 'student', 'John Student', '2025-10-29 14:58:36'),
(2, 'teacher1', '$2y$10$HOetT4dGQm0soesPyoXM1.yJmjx1So28NJsOwzxXB0ktyDRXQQH0K', 'teacher', 'Ms. Teacher', '2025-10-29 14:58:36'),
(3, 'staff1', '$2y$10$zkjWQKu8PVzaKJKuKA01u.nYvU.EeSV6PlW6jWpCENsOqUK8xXl0C', 'staff', 'Staff Member', '2025-10-29 14:58:36'),
(4, 's2', '$2y$10$JKH22Eu3uTd8boUyVlUpmOgbXSRzgbGwO047xGewX9gVh26JUwFta', 'student', '12', '2025-10-29 15:00:18'),
(5, 'admin1', '$2y$10$HOetT4dGQm0soesPyoXM1.yJmjx1So28NJsOwzxXB0ktyDRXQQH0K', 'admin', 'Admin User', '2025-10-29 17:55:43');

-- --------------------------------------------------------

--
-- Table structure for table `violations`
--

CREATE TABLE `violations` (
  `id` int(11) NOT NULL,
  `exam_session_id` int(11) DEFAULT NULL,
  `student_name` varchar(255) NOT NULL,
  `exam_title` varchar(255) NOT NULL,
  `violation_type` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `severity` enum('low','medium','high') DEFAULT 'medium',
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `violations`
--

INSERT INTO `violations` (`id`, `exam_session_id`, `student_name`, `exam_title`, `violation_type`, `description`, `severity`, `timestamp`, `metadata`) VALUES
(359, NULL, 'Terminal Test', 'TERMINAL Exam', 'TERMINAL_TEST', 'Testing terminal output', 'low', '2026-02-11 19:29:10', NULL),
(360, NULL, 'Final Test', 'FINAL_TEST Exam', 'FINAL_TEST', 'Final test with debug', 'low', '2026-02-11 19:43:33', NULL),
(361, NULL, 'Scroll Test Student', 'SCROLL_TEST Exam', 'SCROLL_TEST', 'Testing with scroll', 'low', '2026-02-11 19:48:35', NULL),
(362, NULL, 'Scroll Test Student', 'SCROLL_TEST Exam', 'SCROLL_TEST', 'Testing with scroll', 'low', '2026-02-11 19:49:52', NULL),
(363, NULL, 'sdsda s', 'L-L Exam', 'WINDOW_BLUR', 'WINDOW_BLUR - Violation #1 on N/A', 'low', '2026-02-11 20:08:07', NULL),
(364, NULL, 'sdsda s', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q002', 'medium', '2026-02-11 20:08:11', NULL),
(365, NULL, 'sdsda s', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q002', 'high', '2026-02-11 20:08:13', NULL),
(366, NULL, 'sdsda s', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #4 on Q002', 'high', '2026-02-11 20:08:15', NULL),
(367, NULL, 'asd j', 'L-L Exam', 'WINDOW_BLUR', 'WINDOW_BLUR - Violation #1 on N/A', 'low', '2026-02-11 20:32:49', NULL),
(368, NULL, 'asd j', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q006', 'medium', '2026-02-11 20:32:54', NULL),
(369, NULL, 'asd j', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q006', 'high', '2026-02-11 20:32:56', NULL),
(370, NULL, 'asd j', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #4 on Q006', 'high', '2026-02-11 20:32:58', NULL),
(371, NULL, 'asd sds', 'L-L Exam', 'WINDOW_BLUR', 'WINDOW_BLUR - Violation #1 on N/A', 'low', '2026-02-12 06:41:11', NULL),
(372, NULL, 'asd sds', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q020', 'medium', '2026-02-12 06:41:20', NULL),
(373, NULL, 'asd sds', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q020', 'high', '2026-02-12 06:41:22', NULL),
(374, NULL, 'asd sds', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #4 on Q020', 'high', '2026-02-12 06:41:24', NULL),
(375, NULL, 's s', 'L-L Exam', 'WINDOW_BLUR', 'WINDOW_BLUR - Violation #1 on N/A', 'low', '2026-02-12 06:59:38', NULL),
(376, NULL, 's s', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on N/A', 'medium', '2026-02-12 06:59:41', NULL),
(377, NULL, 's s', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q001', 'high', '2026-02-12 06:59:42', NULL),
(378, NULL, 'sdas as', 'L-L Exam', 'WINDOW_BLUR', 'WINDOW_BLUR - Violation #1 on N/A', 'low', '2026-02-12 07:03:48', NULL),
(379, NULL, 'sdas as', 'L-L Exam', 'WINDOW_BLUR', 'WINDOW_BLUR - Violation #2 on Q009', 'medium', '2026-02-12 07:03:52', NULL),
(380, NULL, 'sdas as', 'L-L Exam', 'TAB_SWITCH', 'TAB_SWITCH - Violation #3 on Q009', 'high', '2026-02-12 07:03:53', NULL),
(381, NULL, 'sdas as', 'L-L Exam', 'WINDOW_BLUR', 'WINDOW_BLUR - Violation #4 on Q009', 'high', '2026-02-12 07:03:56', NULL),
(382, NULL, 'asd asd', 'L-L Exam', 'FULLSCREEN_EXIT', 'FULLSCREEN_EXIT - Violation #1 on Q002', 'low', '2026-02-12 07:04:42', NULL),
(383, NULL, 'asd asd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q002', 'medium', '2026-02-12 07:04:46', NULL),
(384, NULL, 'asd asd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q002', 'high', '2026-02-12 07:04:47', NULL),
(385, NULL, 'asd asd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q009', 'low', '2026-02-12 07:05:25', NULL),
(386, NULL, 'asd asd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q009', 'medium', '2026-02-12 07:05:28', NULL),
(387, NULL, 'asd asd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q009', 'high', '2026-02-12 07:05:30', NULL),
(388, NULL, 'asds asd', 'L-L Exam', 'WINDOW_BLUR', 'WINDOW_BLUR - Violation #1 on Q008', 'low', '2026-02-12 07:15:23', NULL),
(389, NULL, 'asds asd', 'L-L Exam', 'WINDOW_BLUR', 'WINDOW_BLUR - Violation #2 on Q008', 'medium', '2026-02-12 07:15:54', NULL),
(390, NULL, 'asds asd', 'L-L Exam', 'WINDOW_BLUR', 'WINDOW_BLUR - Violation #3 on Q008', 'high', '2026-02-12 07:15:56', NULL),
(391, NULL, 'asd sad', 'L-L Exam', 'WINDOW_BLUR', 'WINDOW_BLUR - Violation #1 on Q020', 'low', '2026-02-12 07:17:22', NULL),
(392, NULL, 'asd sad', 'L-L Exam', 'TAB_SWITCH', 'TAB_SWITCH - Violation #2 on Q020', 'medium', '2026-02-12 07:17:23', NULL),
(393, NULL, 'asd sad', 'L-L Exam', 'WINDOW_BLUR', 'WINDOW_BLUR - Violation #3 on Q020', 'high', '2026-02-12 07:17:43', NULL),
(394, NULL, 'asd asd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q006', 'low', '2026-02-12 07:22:50', NULL),
(395, NULL, 'asd asd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q006', 'medium', '2026-02-12 07:22:54', NULL),
(396, NULL, 'asd asd', 'L-L Exam', 'RELOAD_ATTEMPT', 'RELOAD_ATTEMPT - Violation #3 on Q006', 'high', '2026-02-12 07:22:59', NULL),
(397, NULL, 'asdsad asd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q013', 'low', '2026-02-12 07:25:52', NULL),
(398, NULL, 'asdsad asd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q013', 'medium', '2026-02-12 07:26:00', NULL),
(399, NULL, 'asdsad asd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q013', 'high', '2026-02-12 07:26:04', NULL),
(400, NULL, 'j asd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q004', 'low', '2026-02-12 07:48:17', NULL),
(401, NULL, 'j asd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q004', 'medium', '2026-02-12 07:48:21', NULL),
(402, NULL, 'j asd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q004', 'high', '2026-02-12 07:48:25', NULL),
(403, NULL, 'asd asd', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q007', 'low', '2026-02-12 07:57:43', NULL),
(404, NULL, 'asd asd', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q007', 'medium', '2026-02-12 07:57:45', NULL),
(405, NULL, 'asd asd', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q007', 'high', '2026-02-12 07:57:48', NULL),
(406, NULL, 'asd asdas', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q012', 'low', '2026-02-12 08:02:45', NULL),
(407, NULL, 'asd asdas', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q012', 'medium', '2026-02-12 08:02:47', NULL),
(408, NULL, 'asd asdas', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q012', 'high', '2026-02-12 08:02:48', NULL),
(409, NULL, 'ads asd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q013', 'low', '2026-02-12 08:08:39', NULL),
(410, NULL, 'ads asd', 'L-L Exam', 'COPY_ATTEMPT', 'COPY_ATTEMPT - Violation #2 on Q013', 'medium', '2026-02-12 08:08:43', NULL),
(411, NULL, 'ads asd', 'L-L Exam', 'PASTE_ATTEMPT', 'PASTE_ATTEMPT - Violation #3 on Q013', 'high', '2026-02-12 08:08:46', NULL),
(412, NULL, 'asd-- asd', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q004', 'low', '2026-02-12 08:13:44', NULL),
(413, NULL, 'asd-- asd', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q004', 'medium', '2026-02-12 08:13:45', NULL),
(414, NULL, 'asd-- asd', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q004', 'high', '2026-02-12 08:13:47', NULL),
(415, NULL, 'mmma ppa', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q005', 'low', '2026-02-12 08:20:28', NULL),
(416, NULL, 'mmma ppa', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q005', 'medium', '2026-02-12 08:20:31', NULL),
(417, NULL, 'mmma ppa', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q005', 'high', '2026-02-12 08:20:35', NULL),
(418, NULL, 'asdsam asdmmasd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q007', 'low', '2026-02-12 08:23:04', NULL),
(419, NULL, 'asdsam asdmmasd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q007', 'medium', '2026-02-12 08:23:05', NULL),
(420, NULL, 'asdsam asdmmasd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q007', 'high', '2026-02-12 08:23:07', NULL),
(421, NULL, 'asdsam asdmmasd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #4 on Q007', 'high', '2026-02-12 08:23:09', NULL),
(422, NULL, 'paan mman', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q018', 'low', '2026-02-12 08:25:44', NULL),
(423, NULL, 'paan mman', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q018', 'medium', '2026-02-12 08:25:46', NULL),
(424, NULL, 'paan mman', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q018', 'high', '2026-02-12 08:25:47', NULL),
(425, NULL, 'paan mman', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #4 on Q018', 'high', '2026-02-12 08:25:49', NULL),
(426, NULL, 'adven ad', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q018', 'low', '2026-02-12 08:30:55', NULL),
(427, NULL, 'adven ad', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q018', 'medium', '2026-02-12 08:30:57', NULL),
(428, NULL, 'adven ad', 'T-T Exam', 'PASTE_ATTEMPT', 'PASTE_ATTEMPT - Violation #3 on Q017', 'high', '2026-02-12 08:31:04', NULL),
(429, NULL, 'asdasda aasdasda', 'L-L Exam', 'PAGE_RELOAD', 'PAGE_RELOAD - Violation #1 on Q017', 'low', '2026-02-12 08:49:13', NULL),
(430, NULL, 'asdas das', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q010', 'low', '2026-02-12 08:50:23', NULL),
(431, NULL, 'asdas das', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q010', 'medium', '2026-02-12 08:50:26', NULL),
(432, NULL, 'asdas das', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q010', 'high', '2026-02-12 08:50:28', NULL),
(433, NULL, 'asd sdasd213', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q004', 'low', '2026-02-12 08:51:05', NULL),
(434, NULL, 'asd sdasd213', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q004', 'medium', '2026-02-12 08:51:06', NULL),
(435, NULL, 'asd sdasd213', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q004', 'high', '2026-02-12 08:51:08', NULL),
(436, NULL, 'asdsdsdsdsd asd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q002', 'low', '2026-02-12 08:52:57', NULL),
(437, NULL, 'asdsdsdsdsd asd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q002', 'medium', '2026-02-12 08:52:58', NULL),
(438, NULL, 'asdsdsdsdsd asd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q018', 'high', '2026-02-12 08:53:04', NULL),
(439, NULL, 'asdsd asd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q007', 'low', '2026-02-12 09:00:11', NULL),
(440, NULL, 'asdsd asd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q007', 'medium', '2026-02-12 09:00:13', NULL),
(441, NULL, 'asdsd asd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q007', 'high', '2026-02-12 09:00:15', NULL),
(442, NULL, 'asdsd asd', 'L-L Exam', 'WINDOW_BLUR', 'WINDOW_BLUR - Violation #4 on Q007', 'high', '2026-02-12 09:00:17', NULL),
(443, NULL, 'asdasdsa21 asd', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q006', 'low', '2026-02-12 09:03:38', NULL),
(444, NULL, 'asdasdsa21 asd', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q006', 'medium', '2026-02-12 09:03:41', NULL),
(445, NULL, 'asdasdsa21 asd', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q006', 'high', '2026-02-12 09:03:42', NULL),
(446, NULL, 'asdasdsa21 asd', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #4 on Q006', 'high', '2026-02-12 09:03:45', NULL),
(447, NULL, 'asdasd asda', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q018', 'low', '2026-02-12 09:07:31', NULL),
(448, NULL, 'asdasd asda', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q018', 'medium', '2026-02-12 09:07:33', NULL),
(449, NULL, 'asdasd asda', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q018', 'high', '2026-02-12 09:07:35', NULL),
(450, NULL, 'asdasd asda', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #4 on Q018', 'high', '2026-02-12 09:07:37', NULL),
(451, NULL, 'asd asd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q013', 'low', '2026-02-12 09:16:18', NULL),
(452, NULL, 'asd asd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q013', 'medium', '2026-02-12 09:16:20', NULL),
(453, NULL, 'asd asd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q013', 'high', '2026-02-12 09:16:22', NULL),
(454, NULL, 'asd asd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #4 on Q013', 'high', '2026-02-12 09:16:24', NULL),
(455, NULL, 'pppan ppan', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q014', 'low', '2026-02-12 09:17:53', NULL),
(456, NULL, 'pppan ppan', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q014', 'medium', '2026-02-12 09:17:56', NULL),
(457, NULL, 'pppan ppan', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q014', 'high', '2026-02-12 09:17:58', NULL),
(458, NULL, 'asdasd2 asdasd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q008', 'low', '2026-02-12 09:40:40', NULL),
(459, NULL, 'asdasd2 asdasd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q008', 'medium', '2026-02-12 09:40:42', NULL),
(460, NULL, 'asdasd2 asdasd', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q008', 'high', '2026-02-12 09:40:44', NULL),
(461, NULL, 'asdasd asdsad', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q017', 'low', '2026-02-12 09:50:00', NULL),
(462, NULL, 'asdasd asdsad', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q017', 'medium', '2026-02-12 09:50:02', NULL),
(463, NULL, 'asdasd asdsad', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q017', 'high', '2026-02-12 09:50:03', NULL),
(464, NULL, 'asdasdas asdasda', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q009', 'low', '2026-02-12 09:51:03', NULL),
(465, NULL, 'asdasdas asdasda', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q009', 'medium', '2026-02-12 09:51:05', NULL),
(466, NULL, 'asdasdas asdasda', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q009', 'high', '2026-02-12 09:51:06', NULL),
(467, NULL, 'joestar jojo', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q015', 'low', '2026-02-12 10:01:08', NULL),
(468, NULL, 'joestar jojo', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q015', 'medium', '2026-02-12 10:01:11', NULL),
(469, NULL, 'joestar jojo', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q015', 'high', '2026-02-12 10:01:13', NULL),
(470, NULL, 'asdasda asd', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q015', 'low', '2026-02-12 10:08:33', NULL),
(471, NULL, 'asdasda asd', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q015', 'medium', '2026-02-12 10:08:42', NULL),
(472, NULL, 'asdasda asd', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q015', 'high', '2026-02-12 10:08:44', NULL),
(473, NULL, 'asd asda', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q014', 'low', '2026-02-12 10:16:39', NULL),
(474, NULL, 'asd asda', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q014', 'medium', '2026-02-12 10:16:41', NULL),
(475, NULL, 'asd asda', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q014', 'high', '2026-02-12 10:16:43', NULL),
(476, NULL, 'joe joe', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q009', 'low', '2026-02-12 10:23:08', NULL),
(477, NULL, 'joe joe', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q009', 'medium', '2026-02-12 10:23:10', NULL),
(478, NULL, 'joe joe', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q009', 'high', '2026-02-12 10:23:12', NULL),
(479, NULL, 'joe joe', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #4 on Q009', 'high', '2026-02-12 10:23:13', NULL),
(480, NULL, 'sda asdjoe', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q018', 'low', '2026-02-12 10:27:38', NULL),
(481, NULL, 'sda asdjoe', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q018', 'medium', '2026-02-12 10:27:39', NULL),
(482, NULL, 'sda asdjoe', 'L-L Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q018', 'high', '2026-02-12 10:27:41', NULL),
(483, NULL, 'joe joa', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q001', 'low', '2026-02-12 10:31:07', NULL),
(484, NULL, 'joe joa', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q001', 'medium', '2026-02-12 10:31:09', NULL),
(485, NULL, 'joe joa', 'T-T Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q001', 'high', '2026-02-12 10:31:11', NULL),
(486, 37, 'Alice Johnson', 'survey', 'WINDOW_SWITCH', 'Student switched to another application or window', 'medium', '2026-02-18 22:38:36', NULL),
(487, 37, 'Alice Johnson', 'survey', 'TAB_SWITCH', 'Student switched tabs, minimized window, or switched applications', 'medium', '2026-02-18 22:38:38', NULL),
(488, 37, 'Alice Johnson', 'survey', 'TAB_SWITCH', 'Student switched tabs, minimized window, or switched applications', 'medium', '2026-02-18 22:45:09', NULL),
(489, 37, 'Alice Johnson', 'survey', 'WINDOW_SWITCH', 'Student switched to another application or window', 'medium', '2026-02-18 22:45:14', NULL),
(490, 37, 'Alice Johnson', 'survey', 'WINDOW_SWITCH', 'Student switched to another application or window', 'medium', '2026-02-18 22:45:15', NULL),
(491, 37, 'Alice Johnson', 'survey', 'TAB_SWITCH', 'Student switched tabs, minimized window, or switched applications', 'medium', '2026-02-18 22:45:15', NULL),
(492, 37, 'Alice Johnson', 'survey', 'WINDOW_SWITCH', 'Student switched to another application or window', 'medium', '2026-02-18 22:45:19', NULL),
(493, 37, 'Alice Johnson', 'survey', 'TAB_SWITCH', 'Student switched tabs, minimized window, or switched applications', 'medium', '2026-02-18 22:45:19', NULL),
(494, 37, 'Alice Johnson', 'survey', 'TAB_SWITCH', 'Student switched tabs, minimized window, or switched applications', 'medium', '2026-02-18 22:45:24', NULL),
(495, 37, 'Alice Johnson', 'survey', 'WINDOW_SWITCH', 'Student switched to another application or window', 'medium', '2026-02-18 22:45:24', NULL),
(496, 37, 'Alice Johnson', 'survey', 'WINDOW_SWITCH', 'Student switched to another application or window', 'medium', '2026-02-18 22:45:32', NULL),
(497, 37, 'Alice Johnson', 'survey', 'TAB_SWITCH', 'Student switched tabs, minimized window, or switched applications', 'medium', '2026-02-18 22:45:32', NULL),
(498, NULL, 'as AS', 'TWICE2 Exam', 'PAGE_RELOAD', 'PAGE_RELOAD - Violation #1 on N/A', 'low', '2026-02-18 22:46:10', NULL),
(499, NULL, 'asdsa asd', 'TWICE-TEST2 Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q009', 'low', '2026-02-19 03:25:42', NULL),
(500, NULL, 'asdsa asd', 'TWICE-TEST2 Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q009', 'medium', '2026-02-19 03:25:45', NULL),
(501, NULL, 'asdsa asd', 'TWICE-TEST2 Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q009', 'high', '2026-02-19 03:25:48', NULL),
(502, NULL, 'asdsa asd', 'TWICE-TEST2 Exam', 'PAGE_RELOAD', 'PAGE_RELOAD - Violation #1 on Q024', 'low', '2026-02-19 03:26:15', NULL),
(503, NULL, 'sabi ni paul i love you daw', 'TWICE-TEST2 Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q012', 'low', '2026-02-19 03:28:28', NULL),
(504, NULL, 'sabi ni paul i love you daw', 'TWICE-TEST2 Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q012', 'medium', '2026-02-19 03:28:33', NULL),
(505, NULL, 'sabi ni paul i love you daw', 'TWICE-TEST2 Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q012', 'high', '2026-02-19 03:28:35', NULL),
(506, NULL, 'pol asddd', 'TEST2 Exam', 'CLOSE_ATTEMPT', 'CLOSE_ATTEMPT - Violation #1 on N/A', 'low', '2026-02-19 04:07:11', NULL),
(507, NULL, 'pol asddd', 'TEST2 Exam', 'CLOSE_ATTEMPT', 'CLOSE_ATTEMPT - Violation #2 on N/A', 'medium', '2026-02-19 04:07:16', NULL),
(508, NULL, 'pol asddd', 'TEST2 Exam', 'CLOSE_ATTEMPT', 'CLOSE_ATTEMPT - Violation #3 on N/A', 'high', '2026-02-19 04:07:18', NULL),
(509, NULL, 'love you sabi ni pol', 'TEST2 Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q010', 'low', '2026-02-19 04:36:44', NULL),
(510, NULL, 'love you sabi ni pol', 'TEST2 Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q010', 'medium', '2026-02-19 04:36:47', NULL),
(511, NULL, 'love you sabi ni pol', 'TEST2 Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q010', 'high', '2026-02-19 04:36:49', NULL),
(512, NULL, 'love you sabi ni pol', 'TEST2 Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #4 on Q010', 'high', '2026-02-19 04:36:51', NULL),
(513, NULL, 'bork bork brok arf arf arf', 'TEST2 Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #1 on Q018', 'low', '2026-02-19 05:14:14', NULL),
(514, NULL, 'bork bork brok arf arf arf', 'TEST2 Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #2 on Q018', 'medium', '2026-02-19 05:14:16', NULL),
(515, NULL, 'bork bork brok arf arf arf', 'TEST2 Exam', 'RIGHT_CLICK', 'RIGHT_CLICK - Violation #3 on Q018', 'high', '2026-02-19 05:14:18', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `administrators`
--
ALTER TABLE `administrators`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `exams`
--
ALTER TABLE `exams`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_id` (`unique_id`),
  ADD KEY `idx_exams_unique_id` (`unique_id`),
  ADD KEY `idx_exams_teacher_id` (`teacher_id`);

--
-- Indexes for table `exam_sessions`
--
ALTER TABLE `exam_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `session_token` (`session_token`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `idx_exam_sessions_exam_id` (`exam_id`);

--
-- Indexes for table `proctoring_settings`
--
ALTER TABLE `proctoring_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `setting_key` (`setting_key`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `student_id` (`student_id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_students_student_id` (`student_id`);

--
-- Indexes for table `system_logs`
--
ALTER TABLE `system_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_system_logs_user_type_id` (`user_type`,`user_id`);

--
-- Indexes for table `teachers`
--
ALTER TABLE `teachers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `employee_id` (`employee_id`),
  ADD KEY `idx_teachers_email` (`email`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indexes for table `violations`
--
ALTER TABLE `violations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_violations_exam_session_id` (`exam_session_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `administrators`
--
ALTER TABLE `administrators`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `exams`
--
ALTER TABLE `exams`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `exam_sessions`
--
ALTER TABLE `exam_sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- AUTO_INCREMENT for table `proctoring_settings`
--
ALTER TABLE `proctoring_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `students`
--
ALTER TABLE `students`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `system_logs`
--
ALTER TABLE `system_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=102;

--
-- AUTO_INCREMENT for table `teachers`
--
ALTER TABLE `teachers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `violations`
--
ALTER TABLE `violations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=516;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `exams`
--
ALTER TABLE `exams`
  ADD CONSTRAINT `exams_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `exam_sessions`
--
ALTER TABLE `exam_sessions`
  ADD CONSTRAINT `exam_sessions_ibfk_1` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `exam_sessions_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `violations`
--
ALTER TABLE `violations`
  ADD CONSTRAINT `violations_ibfk_1` FOREIGN KEY (`exam_session_id`) REFERENCES `exam_sessions` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

-- ============================================================
-- MIGRATION: New features added
-- ============================================================

-- Add teacher_deleted column to exams (soft delete for teacher side)
ALTER TABLE `exams` ADD COLUMN IF NOT EXISTS `teacher_deleted` TINYINT(1) NOT NULL DEFAULT 0;

-- Student exam whitelist table
CREATE TABLE IF NOT EXISTS `exam_whitelist` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `exam_id` int(11) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_exam_student` (`exam_id`, `last_name`),
  KEY `idx_exam_whitelist_exam` (`exam_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- GAS (Google Apps Script) exam sessions — tracks students using the Sheets-based exam flow
-- This is what populates the Activity Log for the teacher dashboard
CREATE TABLE IF NOT EXISTS `gs_exam_sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `exam_id` int(11) DEFAULT NULL,
  `student_name` varchar(255) NOT NULL,
  `student_section` varchar(100) DEFAULT '',
  `exam_code` varchar(50) NOT NULL,
  `start_time` datetime NOT NULL,
  `last_seen` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `status` enum('active','completed') DEFAULT 'active',
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_gs_code` (`exam_code`),
  KEY `idx_gs_student` (`student_name`),
  KEY `idx_gs_status_seen` (`status`, `last_seen`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

