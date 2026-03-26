-- WMSU ILS Database Backup
-- Generated on: 2026-03-26T12:17:50.304Z
-- Server: development

-- Table: attendance
CREATE TABLE `attendance` (
  `id` varchar(50) NOT NULL,
  `studentId` varchar(50) NOT NULL,
  `studentName` varchar(200) NOT NULL,
  `gradeLevel` varchar(50) NOT NULL,
  `section` varchar(50) NOT NULL,
  `date` date NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `time` varchar(20) DEFAULT NULL,
  `status` enum('Present','Absent','Late') NOT NULL,
  `period` enum('morning','afternoon') DEFAULT NULL,
  `location` varchar(100) NOT NULL,
  `teacherId` varchar(50) DEFAULT NULL,
  `teacherName` varchar(200) DEFAULT NULL,
  `deviceInfo` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`deviceInfo`)),
  `qrData` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`qrData`)),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- Table: class_assignments
CREATE TABLE `class_assignments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `grade_level` varchar(50) NOT NULL,
  `section` varchar(100) NOT NULL,
  `adviser_id` varchar(255) NOT NULL,
  `adviser_name` varchar(255) DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_class` (`grade_level`,`section`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data for table: class_assignments
INSERT INTO `class_assignments` VALUES ('1', 'Grade 3', 'Diligence', 'f9aa512c-88ab-4cd5-92e7-12121a5e41cb', 'Ashley Villanueva');


-- Table: classes
CREATE TABLE `classes` (
  `id` varchar(255) NOT NULL,
  `grade` varchar(50) NOT NULL,
  `section` varchar(100) NOT NULL,
  `adviser_id` varchar(255) DEFAULT NULL,
  `adviser_name` varchar(200) DEFAULT NULL,
  `createdAt` datetime DEFAULT current_timestamp(),
  `updatedAt` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `grade_section` (`grade`,`section`),
  KEY `idx_adviser` (`adviser_id`),
  CONSTRAINT `classes_ibfk_1` FOREIGN KEY (`adviser_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- Table: delete_requests
CREATE TABLE `delete_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) DEFAULT NULL,
  `student_name` varchar(200) NOT NULL,
  `student_lrn` varchar(12) NOT NULL,
  `requested_by` varchar(100) NOT NULL,
  `request_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `reason` text DEFAULT NULL,
  `status` varchar(20) DEFAULT 'Pending',
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  CONSTRAINT `delete_requests_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- Table: grade_requests
CREATE TABLE `grade_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `student_name` varchar(255) NOT NULL,
  `grade_level` varchar(50) NOT NULL,
  `section` varchar(50) NOT NULL,
  `teacher_name` varchar(255) NOT NULL,
  `request_type` enum('edit','rewrite') NOT NULL,
  `reason` text NOT NULL,
  `quarter` int(11) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `admin_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data for table: grade_requests
INSERT INTO `grade_requests` VALUES ('1', '13', 'Ashley  Natividad Villanueva', 'Kindergarten', 'Love', 'Adviser', 'edit', 'GMRC needs from Q! needs re-editing of grades.', '1', 'All Subjects', 'approved', 'Approved by admin', '2025-12-04 01:27:03', '2025-12-04 01:27:25');
INSERT INTO `grade_requests` VALUES ('2', '12', 'asheley nicole vega', 'Grade 1', 'Humility', 'Adviser', 'rewrite', 'no grades entered', '5', 'All Subjects', 'approved', 'Approved by admin', '2025-12-04 01:35:31', '2025-12-04 01:35:46');
INSERT INTO `grade_requests` VALUES ('3', '14', 'Chris Russell Natividad Villanueva', 'Grade 4', 'Section A', 'Adviser', 'edit', 'Q2 re-edit grades', '5', 'All Subjects', 'approved', 'Approved by admin', '2025-12-04 01:50:03', '2025-12-04 01:50:21');
INSERT INTO `grade_requests` VALUES ('4', '22', 'Ashley  Gutierrez Lopez', 'Grade 1', 'Humility', 'Adviser', 'rewrite', 'lknvnvsvnaild', '3', 'All Subjects', 'approved', 'Approved by admin', '2026-02-05 14:11:36', '2026-02-05 14:12:10');


-- Table: grades
CREATE TABLE `grades` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `subject` varchar(100) NOT NULL,
  `q1` int(11) DEFAULT 0,
  `q2` int(11) DEFAULT 0,
  `q3` int(11) DEFAULT 0,
  `q4` int(11) DEFAULT 0,
  `average` decimal(5,2) GENERATED ALWAYS AS ((`q1` + `q2` + `q3` + `q4`) / 4) STORED,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_student_subject` (`student_id`,`subject`),
  CONSTRAINT `grades_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=468 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- Table: help_center_messages
CREATE TABLE `help_center_messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `teacher_id` varchar(255) NOT NULL,
  `teacher_name` varchar(255) NOT NULL,
  `teacher_email` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `category` enum('Technical','Academic','Account','Other') DEFAULT 'Other',
  `priority` enum('Low','Medium','High','Urgent') DEFAULT 'Medium',
  `status` enum('Pending','In Progress','Resolved','Closed') DEFAULT 'Pending',
  `admin_reply` text DEFAULT NULL,
  `admin_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `grade_level` varchar(50) DEFAULT NULL,
  `section` varchar(50) DEFAULT NULL,
  `teacher_deleted` tinyint(1) DEFAULT 0,
  `admin_deleted` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_teacher_id` (`teacher_id`),
  KEY `idx_status` (`status`),
  KEY `idx_category` (`category`),
  KEY `idx_priority` (`priority`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_grade_level` (`grade_level`),
  KEY `idx_section` (`section`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data for table: help_center_messages
INSERT INTO `help_center_messages` VALUES ('2', 'f9aa512c-88ab-4cd5-92e7-12121a5e41cb', 'Ashley Villanueva', 'hz202300368@wmsu.edu.ph', 'English', 'cant edit grades', 'Academic', 'Medium', 'Closed', 'done', 'f9aa512c-88ab-4cd5-92e7-12121a5e41cb', '2026-03-26 12:43:55', '2026-03-26 19:28:56', 'Grade 2', 'Kindness', '1', '1');
INSERT INTO `help_center_messages` VALUES ('3', 'f9aa512c-88ab-4cd5-92e7-12121a5e41cb', 'RUSSELL villanueva', 'hz202300368@wmsu.edu.ph', 'math', 'dddeerff', 'Other', 'Low', 'In Progress', 'working on it', 'f9aa512c-88ab-4cd5-92e7-12121a5e41cb', '2026-03-26 13:23:39', '2026-03-26 19:28:54', 'Grade 1', 'Humility', '1', '1');
INSERT INTO `help_center_messages` VALUES ('4', 'f9aa512c-88ab-4cd5-92e7-12121a5e41cb', 'ashley', 'ashnicx02@gmail.com', 'csca', 'cscs', 'Other', 'Medium', 'Pending', NULL, NULL, '2026-03-26 19:28:36', '2026-03-26 19:29:29', 'Grade 1', 'Humility', '1', '1');
INSERT INTO `help_center_messages` VALUES ('5', 'f9aa512c-88ab-4cd5-92e7-12121a5e41cb', 'ash', 'studtech1234@gmail.com', 'scss', 'cscs', 'Other', 'Medium', 'Pending', NULL, NULL, '2026-03-26 19:29:44', '2026-03-26 19:30:07', 'Grade 1', 'Humility', '1', '1');
INSERT INTO `help_center_messages` VALUES ('6', 'f9aa512c-88ab-4cd5-92e7-12121a5e41cb', ' f  f f', 'studtech1234@gmail.com', 'a s s', 'dada', 'Other', 'Medium', 'Pending', NULL, NULL, '2026-03-26 19:30:27', '2026-03-26 19:30:52', 'Grade 1', 'Humility', '1', '1');
INSERT INTO `help_center_messages` VALUES ('7', 'f9aa512c-88ab-4cd5-92e7-12121a5e41cb', 'ashley', 'studtech1234@gmail.com', 'eeee', 'aaaaa', 'Other', 'Medium', 'Resolved', 'workingggg', 'f9aa512c-88ab-4cd5-92e7-12121a5e41cb', '2026-03-26 19:32:58', '2026-03-26 19:33:40', 'Grade 1', 'Humility', '1', '1');


-- Table: notifications
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `user_type` enum('admin','teacher','student') NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` varchar(50) NOT NULL,
  `reference_id` int(11) DEFAULT NULL,
  `read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_type` (`user_type`),
  KEY `idx_read` (`read`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data for table: notifications
INSERT INTO `notifications` VALUES ('1', NULL, 'admin', 'Grade Edit Request', 'Adviser requested to edit grades for Ashley  Natividad Villanueva (Kindergarten-Love, Q1)', 'grade_request', '1', '0', '2025-12-04 01:27:03');
INSERT INTO `notifications` VALUES ('2', NULL, 'admin', 'Grade Edit Request', 'Adviser requested to rewrite grades for asheley nicole vega (Grade 1-Humility, Q5)', 'grade_request', '2', '0', '2025-12-04 01:35:31');
INSERT INTO `notifications` VALUES ('3', NULL, 'admin', 'Grade Edit Request', 'Adviser requested to edit grades for Chris Russell Natividad Villanueva (Grade 4-Section A, Q5)', 'grade_request', '3', '0', '2025-12-04 01:50:03');
INSERT INTO `notifications` VALUES ('4', NULL, 'admin', 'Grade Edit Request', 'Adviser requested to rewrite grades for Ashley  Gutierrez Lopez (Grade 1-Humility, Q3)', 'grade_request', '4', '0', '2026-02-05 14:11:36');


-- Table: students
CREATE TABLE `students` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `lrn` varchar(12) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `age` int(11) NOT NULL,
  `sex` varchar(10) NOT NULL,
  `grade_level` varchar(50) NOT NULL,
  `section` varchar(50) NOT NULL,
  `parent_first_name` varchar(255) DEFAULT NULL,
  `parent_last_name` varchar(255) DEFAULT NULL,
  `parent_email` varchar(255) DEFAULT NULL,
  `parent_contact` varchar(20) DEFAULT NULL,
  `student_email` varchar(100) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `profile_pic` longtext DEFAULT NULL,
  `qr_code` longtext DEFAULT NULL,
  `status` varchar(20) DEFAULT 'pending',
  `attendance` varchar(10) DEFAULT '0%',
  `average` int(11) DEFAULT 0,
  `created_by` varchar(50) DEFAULT 'admin',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `decline_reason` text DEFAULT NULL,
  `grades` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `lrn` (`lrn`),
  UNIQUE KEY `wmsu_email` (`student_email`)
) ENGINE=InnoDB AUTO_INCREMENT=80 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data for table: students
INSERT INTO `students` VALUES ('27', '126164100170', 'Ashley Nicole', 'Natividad', 'Villanueva', '10', 'Female', 'Grade 4', 'Honesty', NULL, NULL, NULL, NULL, '126164100170@wmsu.edu.ph', 'WMSU0170647', NULL, '/qrcodes/qr_126164100170_1772122164352.png', 'approved', '0%', '0', 'admin', '2026-02-27 00:09:24', '2026-02-27 00:27:00', NULL, NULL);
INSERT INTO `students` VALUES ('28', '167125143123', 'Chris Russell', 'Natividad', 'Villanueva', '9', 'Male', 'Grade 2', 'Kindness', NULL, NULL, NULL, NULL, '167125143123@wmsu.edu.ph', 'WMSU3123115', NULL, '/qrcodes/qr_167125143123_1772123572885.png', 'approved', '0%', '0', 'admin', '2026-02-27 00:32:53', '2026-02-27 00:41:13', NULL, NULL);
INSERT INTO `students` VALUES ('30', '222222222222', 'dustin', 'fufufuf', 'lalalala', '10', 'Male', 'Grade 4', 'Honesty', 'dededeed', 'dwdwdwd', 'dedede@gmail.com', '09888877776', '222222222222@wmsu.edu.ph', '$2a$12$WGs2CAiNZfOQS51l6pCd1ulsxs9r7Z1Pm5bpGyPQ/qXJCB.TSRe4m', NULL, '/qrcodes/qr_222222222222_1772358249891.png', 'approved', '0%', '0', 'admin', '2026-03-01 17:44:10', '2026-03-01 17:44:34', NULL, NULL);
INSERT INTO `students` VALUES ('31', '787878787878', 'six', 'seven', 'eight', '8', 'Female', 'Grade 2', 'Kindness', 'kind', 'ness', 'kindness@gmail.com', '67676767667', '787878787878@wmsu.edu.ph', '$2a$12$HWUii00hQrH1KECLNYbL5O/vIWzgMKpf4GoxslRbQB1q2S1yZri92', NULL, '/qrcodes/qr_787878787878_1772358466236.png', 'pending', '0%', '0', 'admin', '2026-03-01 17:47:48', '2026-03-01 17:47:48', NULL, NULL);
INSERT INTO `students` VALUES ('32', '123454321234', 'ariana', 'maria', 'granada', '12', 'Female', 'Grade 6', 'Excellence', 'arnold', 'granada', 'granada@gmail.com', '09099898878', '123454321234@wmsu.edu.ph', '$2a$12$TJBeqvduSCg.PL/1Sjac/.xzwLyHiF7/y5VAQer/9kOMABanhpx8W', NULL, '/qrcodes/qr_123454321234_1772358745219.png', 'pending', '0%', '0', 'admin', '2026-03-01 17:52:27', '2026-03-01 17:52:27', NULL, NULL);
INSERT INTO `students` VALUES ('33', '122223334445', 'aaaar', 'dddd', 'ffgg', '12', 'Male', 'Grade 6', 'Leadership', 'dsds', 'sdsdsd', 'ddddd@gmail.com', '78787767555', '122223334445@wmsu.edu.ph', '$2a$12$XDlJmpGxcw9VKiQr9Sax/.goZjjtc/SPTW3vkwHZCg8JsoeUH8JZC', '/student_profiles/profile_122223334445_1772358847310.png', '/qrcodes/qr_122223334445_1772358847324.png', 'pending', '0%', '0', 'admin', '2026-03-01 17:54:08', '2026-03-01 17:54:08', NULL, NULL);
INSERT INTO `students` VALUES ('34', '126167189190', 'Olivia', 'Marie', 'Rodrigo', '11', 'Female', 'Grade 4', 'Honesty', 'Oliver', 'Rodrigo', 'oliver_rodrigo@gmail.com', '09890876564', '126167189190@wmsu.edu.ph', '$2a$12$DoO2NOY25TuSgLj.AIbage5.9925H9sFx9QxvrM3TrLpx0TCVTdBW', '/student_profiles/profile_126167189190_1772359167981.png', '/qrcodes/qr_126167189190_1772359167996.png', 'approved', '0%', '0', 'admin', '2026-03-01 17:59:30', '2026-03-01 18:00:05', NULL, NULL);
INSERT INTO `students` VALUES ('35', '099889098767', 'Justine', 'John', 'Chicago', '11', 'Male', 'Grade 5', 'Responsibility', 'Justin', 'Chicago', 'justin123@gmail.com', '09123475869', '099889098767@wmsu.edu.ph', '$2a$12$RsqHCHmLFsw4n2qVbxykqOiBN5qeXZIr/LMx5K2RXVSy6Dk4BMLWW', '/student_profiles/profile_099889098767_1772359971225.png', '/qrcodes/qr_099889098767_1772359971236.png', 'approved', '0%', '0', 'admin', '2026-03-01 18:12:52', '2026-03-01 18:12:58', NULL, NULL);
INSERT INTO `students` VALUES ('38', '876867565454', 'mkmkmkmk', 'mlmlmlml', 'wwwwe', '12', 'Male', 'Grade 6', 'Leadership', 'huhuhuhu', 'hjhkhkh', 'huhuhuhu@gmail.com', '09475453453', '876867565454@wmsu.edu.ph', '$2a$12$7okEiXo/FZvJkRsjNOsqYOyDuuGVuluY/VSYA4MeQqNymQIjKLZzW', '/student_profiles/profile_876867565454_1772361038320.png', '/qrcodes/qr_876867565454_1772361038325.png', 'pending', '0%', '0', 'admin', '2026-03-01 18:30:39', '2026-03-01 18:30:39', NULL, NULL);
INSERT INTO `students` VALUES ('39', '232323233232', 'ddfdfdfd', 'gfgtgt', 'scsfedr', '12', 'Male', 'Grade 6', 'Leadership', 'xsss', 'xsxsxs', 'xssxs@gmail.com', '09887666666', '232323233232@wmsu.edu.ph', '$2a$12$A9mbmWXtZptML7vR2S/Ieed9xslyZu17oeAexRow8RwVvmPtl8sI.', NULL, '/qrcodes/qr_232323233232_1772361488108.png', 'approved', '0%', '0', 'admin', '2026-03-01 18:38:09', '2026-03-01 18:38:20', NULL, NULL);
INSERT INTO `students` VALUES ('40', '565676768879', 'sfbfbb', 'fnghn', 'nghn', '12', 'Male', 'Grade 6', 'Leadership', 'fdfff', 'gggg', 'gfd@gmail.com', '99997765454', '565676768879@wmsu.edu.ph', '$2a$12$SJqMj1BfybBNxlVLBI7Mg./TsHre3QeeGzCXocdJ.E4R3nVvKLhtK', '/student_profiles/profile_565676768879_1772383529577.png', '/qrcodes/qr_565676768879_1772383529582.png', 'pending', '0%', '0', 'admin', '2026-03-02 00:45:30', '2026-03-02 00:45:30', NULL, NULL);
INSERT INTO `students` VALUES ('41', '090990909090', 'Genesis', 'Brown', 'Brandy', '12', 'Male', 'Grade 6', 'Honesty', 'Esperanza', 'Villanueva', 'espie@gmail.com', '09090909090', '090990909090@wmsu.edu.ph', '$2a$12$82CeDm7GtiJIXLZWA4uPlez6FLFqPVU8FfVvIZDLWK4TULTdMsJl2', NULL, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAAAklEQVR4AewaftIAAAqvSURBVO3BUY7dBpIAwUyi73/lXH0WCJE0/bolz6Ii7BfWWr91sNa6dLDWunSw1rp0sNa69MVvqPwNFXdUpoozlTsVb6lMFX+DylTxlspUMamcVUwqU8VbKlPFpPI3VEwHa61LB2utSwdrrUtf/AMV303lrYq3KiaVqeItlT+h4g2Vs4qpYlJ5q2JSmSrOVKaKtyq+m8qdg7XWpYO11qWDtdalL/4Flbcq3lL5lModlScVk8pUcaYyVUwqT1SmiknlLZW3VKaKqeJvUHmr4o2Dtdalg7XWpYO11qWDtdalL/6fq/iUylQxqZxV3Kn4VMWk8qTiUypTxVsqU8V/0cFa69LBWuvSwVrr0hf/QyqeqNxRmSqeVEwqU8UTlb9BZaqYVKaKM5U3VP6/OFhrXTpYa106WGtd+uJfqPgbVJ5U/LSKSeWtirdUporvpvKk4k7Fn1Dx0w7WWpcO1lqXDtZal774B1T+CyomlScqU8WkclYxqUwVTyomlTsqZxVvqJxVTCpTxaRyVjGpTBWTylnFpDJVPFH50w7WWpcO1lqXDtZalw7WWpfsF/6jVN6quKMyVZyp/LSKt1Smik+pvFXxlsqdiv+ig7XWpYO11qWDtdalL35DZaqYVH5CxVQxqUwVZypTxVsVk8pUMam8pfIplaniicpU8UTljspUcVYxqdxR+QkVbxystS4drLUuHay1Ln3xTSomlaniLZVPqdxROauYKiaVJxWTyp2KJypvqUwVk8pUcVYxqUwVT1TuqEwVb6m8pTJVTAdrrUsHa61LB2utS/YLJyp3Kt5S+RsqPqUyVXw3lScVd1TeqphUnlRMKlPFp1TOKt5QOat442CtdelgrXXpYK116WCtdemL36iYVCaVs4o7FU9U7lQ8UXlD5UnFHZW3KqaKt1Smiv8qlU+p3Kl4onKnYjpYa106WGtdOlhrXbJfeKDyVsUdlbOKSeWtiv8ilU9V3FF5UvHdVD5VMak8qbijclYxqUwV08Fa69LBWuvSwVrr0hffpOKOylRxpjJVfDeVtyruqHyq4onKnYpPqZxVTCp3Ks5U3qg4U5lUPlVx52CtdelgrXXpYK11yX7hG6jcqZhU3qqYVM4qPqXyqYpJZap4S+VOxZnKVPGWylQxqTypmFQ+VTGpTBVnKlPFnYO11qWDtdalg7XWpYO11iX7hQcqU8UTlaniicpUcUflScWk8lbFd1OZKt5SmSqeqEwVk8pZxaQyVTxReaPiTOVOxROVOxXTwVrr0sFa69LBWuuS/cJLKmcVb6g8qXhLZar4lMpUMamcVUwqU8VbKlPFpHJW8YbKWcUdlbcq7qg8qZhU3qq4c7DWunSw1rp0sNa6ZL9wonKn4i2VqeKJyp2Kt1SmijOVT1XcUXmr4i2VqeKOylnFpDJVPFF5o+JM5VMVbxystS4drLUuHay1Ln3xGxU/TeWsYqq4o3JWMalMFW9VTCpvqdypeKJyp+Ks4o7KVPETKu6oTCpPKt5SmSruHKy1Lh2stS4drLUuHay1LtkvnKi8VfEplTcqzlSmijsqZxU/TeWtirdUPlXxKZWp4i2VOxVvqUwV08Fa69LBWuvSwVrr0hf/QMVbKt+t4knFHZVPqTypmFQ+pXKn4knFWypTxaTypGJS+W4qb1XcOVhrXTpYa106WGtd+uKbqNypeEvlLZU7FU9UflrFWypTxVsqn1KZKiaVtyreUpkqJpWzijcO1lqXDtZalw7WWpe++BdUziomlTsqZxV3VKaKt1TeqphUpoozlTdUziruqEwVTyomlbcqJpXvpnJW8UbFE5WpYjpYa106WGtdOlhrXTpYa12yXzhRuVNxpnKn4i2V71bxROVOxVsqU8VbKlPFpHJWMalMFZPKWcWk8t0q3lJ5q+KNg7XWpYO11qWDtdYl+4UfoPLTKs5Upoq3VKaKSWWqOFP50yrOVO5UPFGZKj6l8tMqnqhMFdPBWuvSwVrr0sFa69IX30TljYpPqZxVvKHyVsWkclbxKZU7FU8qJpU7Kk9Upoq3KiaVJxWTylsqbxystS4drLUuHay1LtkvvKTypGJSeatiUpkqzlS+W8VbKlPFp1Smij9BZaqYVJ5UvKFyVvGGypOKOwdrrUsHa61LB2utSwdrrUtf/AMqTyomlTsVZyp3Kt6qmFSeVHyqYlKZKiaVs4qpYlKZKs5UpopJ5UnFpHKn4onKVPGWylTxpGJSmSqmg7XWpYO11qWDtdYl+4UTlaliUjmrmFS+W8VbKncqzlSmikllqjhTeaPiicpUMamcVUwqdyrOVD5VMancqXii8t0qpoO11qWDtdalg7XWJfuFE5XvVvEnqEwVk8pUcaZyp2JSOat4Q+Ws4o7Kd6t4ojJVTCpPKn6aylsV08Fa69LBWuvSwVrr0hc/pOKOypOKSeW/QGWqeKJyp+JM5U7FpHJWMancUXlSMalMFU9U7lScqUwVdyo+dbDWunSw1rp0sNa6dLDWumS/8JLKWcWkMlV8N5Wziknlp1W8pfKkYlK5U3GmcqdiUnmr4rupnFW8oXJWMalMFdPBWuvSwVrr0sFa69IX/0LFmcpUcUflScWkMlWcqfwvqjhTuVMxqTypeKvijspU8UTlTsWZyp2KqeJMZaq4c7DWunSw1rp0sNa69MVvqEwVTyruqEwVZyr/BRVvqJxVTCp3VM4qJpVJZao4U5lUPqUyVUwqb1U8qZhUJpUnFZPKVDEdrLUuHay1Lh2stS598RsVn1KZKiaVT6mcVdxRmSo+VXGmMlXcUTlTuVPxVsWk8lbFpDJVnKncUZkqzlTuVDxReeNgrXXpYK116WCtdelgrXXpi39A5btVnKlMKv8LVN5S+ZTKWypTxaRypnKn4q2KSeVJxR2VqeKsYlK5c7DWunSw1rp0sNa69MVvqEwVT1TeUHlSMam8pTJVTCqfqnii8t0qJpVPVbyl8qRiUrmj8hNUpoo7B2utSwdrrUsHa61L9gv/USpTxaTypGJSmSrOVKaKSWWqeKIyVbyl8lbFpDJVTCpvVTxRuVPxlspUMamcVbxxsNa6dLDWunSw1rr0xW+o/A0VU8WnVO6ovFXx3VTOKu5UPFGZKu5UnKlMFW9VTCp3VM4q7qhMFU9UporpYK116WCtdelgrXXpYK116Yt/oOK7qTxReatiUpkqnqhMKlPFpHJW8UbFT6iYVKaKSeUnqLxR8SmVs4o3DtZalw7WWpcO1lqXvvgXVN6q+BsqJpWp4qxiUplUPqXy3VTOKu6oTBVnKndUpoqzikllUvluFWcqbxystS4drLUuHay1Ln3xP6TiLZWpYlJ5q2JSeatiUjmruKMyVZyp3Kl4UjGpfKpiUpkqzlSmikllUjmreONgrXXpYK116WCtdemL/yEqU8WZylQxqTypuKMyVTypmFSmijOVOxV/gspUMalMKmcVk8odlbOKSWWq+G4Ha61LB2utSwdrrUsHa61LX/wLFX9CxadU3lJ5Q+VJxR2Vt1SmiicVd1TOKiaVOxVPKt5S+dMO1lqXDtZalw7WWpe++AdU/gaVqWJSOauYVKaKt1TeqrhTMam8VTGp/AkVk8qkclYxqUwVk8qTikllqjhTmSruHKy1Lh2stS4drLUu2S+stX7rYK116WCtdelgrXXp/wADqMTktXjbpgAAAABJRU5ErkJggg==', 'approved', '0%', '0', 'admin', '2026-03-05 01:48:22', '2026-03-05 01:48:22', NULL, NULL);
INSERT INTO `students` VALUES ('42', '012321785960', 'Paolo', 'Rupaul', 'Heals', '12', 'Male', 'Grade 6', 'Honesty', 'dsfss', 'fdfd', 'fdfs@gmail.com', '98786757456', '012321785960@wmsu.edu.ph', '$2a$12$HweHYWnJxc1T7fbk3kezE.RTsj6qix/mWfjsoy.SrFfXpqBrkWwL.', NULL, 'data:image/png;base64,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', 'approved', '0%', '0', 'admin', '2026-03-05 20:30:19', '2026-03-05 20:30:19', NULL, NULL);
INSERT INTO `students` VALUES ('43', '121212121216', 'Hero', 'Mendez', 'Diaz', '12', 'Male', 'Grade 2', 'Kindness', 'Harry', 'Diaz', 'harry_diaz@gmail.com', '09786560987', 'hero.diaz@wmsu.edu.ph', '$2a$12$a48l1KNMgUw6ViaPRXg.wuN/pH0/FGf.wd/lHVq2WXzR5LD693f62', NULL, 'data:image/png;base64,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', 'approved', '0%', '0', 'admin', '2026-03-10 21:16:32', '2026-03-10 21:16:32', NULL, NULL);
INSERT INTO `students` VALUES ('74', '260311000000', 'Juan', NULL, 'Dela Cruz', '0', 'N/A', 'Grade 3', 'Wisdom', NULL, NULL, NULL, NULL, 'juan.dela cruz@wmsu.edu.ph', '$2a$12$DO6icpKpM4EyEeoYLF3ZEe1NzfeP6qH5HLVwrPeZBMW3fhyBjUPa2', NULL, 'data:image/png;base64,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', 'Active', '0%', '0', 'admin', '2026-03-11 00:27:30', '2026-03-11 00:27:30', NULL, NULL);
INSERT INTO `students` VALUES ('75', '260311000001', 'Maria', NULL, 'Santos', '0', 'N/A', 'Grade 4', 'Knowledge', NULL, NULL, NULL, NULL, 'maria.santos@wmsu.edu.ph', '$2a$12$F7.zX.wiqmjpRpqzwv1NnOqVYi5kNnl8WQAQJ03HZ77heMFpuz.OK', NULL, 'data:image/png;base64,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', 'Active', '0%', '0', 'admin', '2026-03-11 00:27:31', '2026-03-11 00:27:31', NULL, NULL);
INSERT INTO `students` VALUES ('76', '260311000002', 'Carlos', NULL, 'Reyes', '0', 'N/A', 'Grade 2', 'Hope', NULL, NULL, NULL, NULL, 'carlos.reyes@wmsu.edu.ph', '$2a$12$22C000NQPZcAgVSWIZhfsuwrNWCJ7Q95jbAmCsjfITy6rjbIs7bGa', NULL, 'data:image/png;base64,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', 'Active', '0%', '0', 'admin', '2026-03-11 00:27:32', '2026-03-11 00:27:32', NULL, NULL);
INSERT INTO `students` VALUES ('77', '260311000003', 'Ana', NULL, 'Lopez', '0', 'N/A', 'Grade 1', 'Faith', NULL, NULL, NULL, NULL, 'ana.lopez@wmsu.edu.ph', '$2a$12$Arh2Nc0UtCCFCfi.0oB8Oe0nblB1XQtAApNtR4fqMOqiEJhbFfZbC', NULL, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAAAklEQVR4AewaftIAAAlLSURBVO3BUY5juZYEwXBC+9+yT30SB0VQdSFlTj+EGf6Rqvqrlao6Wqmqo5WqOlqpqqNX/gLIb1OzAzKpuQEyqZmA7NRMQJ5QMwH5BDUTkE9QMwGZ1HwCkN+mZrdSVUcrVXW0UlVHK1V19Mqb1HwLkCeATGpugExqdkAmNROQnZoJyG9SMwH5FiDvUHOj5luA3KxU1dFKVR2tVNXRKw8BeULNp6i5UTMBuVHzDjU3am6ATGp2QCYgN0AmNROQJ4Ds1ExAPgXIE2r+1UpVHa1U1dFKVR2tVNXRK/8Rat4B5EbNDZBJzRNAJjU7NU+ouQEyAZnU7IBMaiYgN2r+i1aq6milqo5WqupopaqOXvmPADKp+UlAJjU3am6A3KiZgExqdmomIDdqJiCTmh2QSc1/0UpVHa1U1dFKVR298pCan6RmAnKjZgJyo2YC8gSQSc1OzQ2QSc0E5EbNDZAn1ExAJjVPqPkpK1V1tFJVRytVdbRSVUevvAnIbwIyqZmAPKFmB2RSMwHZqXkCyKTmE9RMQCY1N2omIDs1nwLkN61U1dFKVR2tVNXRSlUd4R/5HwLkRs0EZKdmAjKpeQLITs0TQCY1OyBPqHkHkJ2aCcik5v+7lao6Wqmqo5WqOsI/MgCZ1NwA+W1qboB8i5oJyI2aCciNmgnIjZoJyI2aGyBPqHkHkJ2aCcgTanYrVXW0UlVHK1V1tFJVR6+8Cci3qJmA7NRMQCYgN2omIDdqPkXNDsikZgfkHWp+EpAbNZ+i5kbNBORfrVTV0UpVHa1U1dFKVR298kFqJiA3QG6ATGqeAPIEkEnNjZoJyE8B8oSaCciNmgnIpOYTgExqbtTcrFTV0UpVHa1U1RH+kQ8BMqnZAZnUTEC+Rc0TQG7UTEAmNf8KyDvU7IBMaiYgv0nNO4Ds1LwDyE7NzUpVHa1U1dFKVR2tVNUR/pE3ANmpmYDcqJmATGpugExqdkCeUDMBmdR8ApAbNe8AcqPmBsgTaiYgP0nNBORGzW6lqo5WqupopaqOVqrq6JW/APKEmhsgk5obIJOaCchOzTuAfAuQGzU3QCY1k5odkAnIjZp3ANkBmdRMQG7U3AB5h5p/tVJVRytVdbRSVUevfBCQJ4A8AeQGyDvU7IBMam6ATGp+k5oJyKTmBsikZgdkAjKp2QF5B5CdmgnIpOZfrVTV0UpVHa1U1dFKVR3hHxmAPKHmtwG5UfOTgNyomYDs1ExAJjU3QJ5QcwNkUjMBuVHzLUAmNbuVqjpaqaqjlao6WqmqI/wjDwB5h5odkG9ScwNkUrMD8g41OyCTmgnIjZobIDdq3gHkRs0EZKdmAjKp+RYgk5p/tVJVRytVdbRSVUf4RwYgN2omIJOaJ4Ds1HwTkJ2aTwFyo+YGyDvU3ACZ1NwAeULNpwC5UTMBuVGzW6mqo5WqOlqpqqOVqjp65S/U3ACZ1ExAdmomIN8CZFJzA2RSMwHZqZnUTEA+Qc0E5EbNBORGzQ2QCcikZgfkJ6m5Wamqo5WqOlqpqqOVqjrCP/IAkHeo+QQg71CzA/KEmgnIpGYH5B1qPgHIpGYH5CepmYBMam6A3Kj5lpWqOlqpqqOVqjp65U1AvgXIpOYT1DwB5Ak17wCyU3MDZFJzo2YC8ilqdkDeAeRGzRNAJjX/aqWqjlaq6milqo5Wqurolb8A8oSaCchOzaRmAvIJQCY1N2omIDdAngAyqXkCyE7NE2omIDdqJiCTmh2QdwDZqXkHkJ2am5WqOlqpqqOVqjrCP/LLgDyhZgJyo2YC8pPU7IDcqJmA3KiZgExqdkCeUPMOIDs1E5BJzU9Zqaqjlao6Wqmqo5WqOsI/8kVAbtTcAHmHmh2QSc0E5EbNE0Bu1NwAmdR8CpAn1HwLkBs137JSVUcrVXW0UlVHK1V1hH9kADKp2QH5JjWfAGRScwPkf4WaCciNmieAfIqaCciNmk9Yqaqjlao6Wqmqo1f+Qs23qPkUIJOaJ4B8gpp3ANmp+RYgk5oJyBNAdmqeADIBeQLIpOZfrVTV0UpVHa1U1dFKVR298hdAbtRMQG6APKHmHUB2aiYgT6i5ATKp+QQgk5oJyE7NE0AmNTdA3qHmRs0NkHcAuVGzW6mqo5WqOlqpqqOVqjp65U1qbtT8NjU7IJOaGyATkBs1E5AbIJOaJ9TcAPkWNU+omYB8ipp/tVJVRytVdbRSVUevvAnIE2pugDyh5gkgk5qdmgnIpGYH5B1qdkBu1ExAJjU7IE+omYD8F6iZgOzU3KxU1dFKVR2tVNXRSlUdvfLDgExqPgXITs0E5AbIpOYJNTdqboC8A8hOzTuA7IA8AWRSMwF5Qs0NkEnNDsikZrdSVUcrVXW0UlVHK1V19MqXAbkB8ilqdkAmNROQnZp3ANmpeQeQGzU3aiYg36LmBsgEZFKzA/IEkHcA+VcrVXW0UlVHK1V19MoHqfkWIJOaCchOzTepuQHyCWomIJOaHZBJzY2adwDZqXlCzQTkCTU3QG5WqupopaqOVqrqaKWqjl75ICA3aiYgTwCZ1OyATGo+BchOzaRmAvKvgExqbtRMQG6ATGpugHwTkCeA/KuVqjpaqaqjlao6Wqmqo1f+Qs1PUnMD5Ak1E5AngHyLmt+m5gk1N0AmNU8AuQHyCStVdbRSVUcrVXX0yl8A+W1qbtQ8oWYCsgPyBJB3qNkBmdTcAHlCzQRkp+YnAZnUPKFmArJTc7NSVUcrVXW0UlVHK1V19Mqb1HwLkCeA3KiZgExqdkAmNROQGzVPANmp+f8IyCeoeULNt6xU1dFKVR2tVNXRSlUdvfIQkCfUfJOaHZBJzQTkBsikZgdkAvItQL4FyKRmUnMDZALyCUC+ZaWqjlaq6milqo5e+R+nZgLyLWqeAHID5B1qdkAmNTdA3gHkRs0EZKdmAjKp2QF5h5p/tVJVRytVdbRSVUcrVXX0yn+EmgnIBGSn5gk1E5DfpGYCMgF5AshOzTvU7IB8E5AngNyo2a1U1dFKVR2tVNXRSlUdvfKQmv8qNU+ouQHyKWqeUPMJQCY1E5CdmgnIp6jZAZnU3AC5Wamqo5WqOlqpqqNX3gTkNwGZ1ExAdkCeUPMOIDs1TwCZgOzUvAPITs0E5EbNE0C+CchOzQRkUrNTc7NSVUcrVXW0UlVHK1V1hH+kqv5qpaqOVqrqaKWqjv4P/Hqp6ULe+F8AAAAASUVORK5CYII=', 'Active', '0%', '0', 'admin', '2026-03-11 00:27:32', '2026-03-11 00:27:32', NULL, NULL);
INSERT INTO `students` VALUES ('78', '260311000004', 'Mark', NULL, 'Cruz', '0', 'N/A', 'Grade 5', 'Integrity', NULL, NULL, NULL, NULL, 'mark.cruz@wmsu.edu.ph', '$2a$12$hS2NFqUkzH6sqrARrUf9MuqHk3ao3H7a4DrpRatOoFt8twPKSpjUS', NULL, 'data:image/png;base64,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', 'Active', '0%', '0', 'admin', '2026-03-11 00:27:33', '2026-03-11 00:27:33', NULL, NULL);
INSERT INTO `students` VALUES ('79', '260311000005', 'Liza', NULL, 'Ramos', '0', 'N/A', 'Grade 6', 'Perseverance', NULL, NULL, NULL, NULL, 'liza.ramos@wmsu.edu.ph', '$2a$12$mxBcUHugFPMgaccUqAwjee9rCkgLlj5MGpNbA5TFBEraCkY49odRu', NULL, 'data:image/png;base64,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', 'Active', '0%', '0', 'admin', '2026-03-11 00:27:33', '2026-03-11 00:27:33', NULL, NULL);


-- Table: subject_teachers
CREATE TABLE `subject_teachers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `class_id` varchar(255) NOT NULL,
  `teacher_id` varchar(255) NOT NULL,
  `teacher_name` varchar(200) NOT NULL,
  `subject` varchar(100) NOT NULL,
  `assignedAt` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `teacher_id` (`teacher_id`),
  KEY `idx_class_teacher` (`class_id`,`teacher_id`),
  KEY `idx_subject` (`subject`),
  CONSTRAINT `subject_teachers_ibfk_1` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `subject_teachers_ibfk_2` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- Table: teachers
CREATE TABLE `teachers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('adviser','subject_teacher') NOT NULL DEFAULT 'adviser',
  `subjects` text DEFAULT NULL,
  `grade_level` varchar(50) DEFAULT NULL,
  `section` varchar(50) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `profile_pic` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `verification_status` enum('pending','approved','rejected') DEFAULT 'pending',
  `decline_reason` text DEFAULT NULL,
  `plain_password` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=849800004 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data for table: teachers
INSERT INTO `teachers` VALUES ('1', 'maria_santos', 'Maria', 'Santos', 'Maria', 'maria.santos@wmsu.edu.ph', '$2a$12$Nwi4oH.qS/pcJ1Od7K8Jg.gpYr3GB10TFYkPOMXhI4dHnrkqdT4tq', 'adviser', '["GMRC","English","Mathematics","Filipino","Science"]', 'Grade 6', 'Wisdom', NULL, NULL, '2026-03-02 00:39:41', '2026-03-02 00:39:41', 'approved', NULL, NULL);
INSERT INTO `teachers` VALUES ('3', 'john_smith', 'John', 'Smith', 'John', 'john.smith@wmsu.edu.ph', '$2a$12$hrf3TXYvpyaoRmMlgfm5n.9EBucKKTeTiC40G8p8dwGdUa0K3vNkK', 'subject_teacher', '["English","ArPan","MAPEH"]', 'Grade 5', 'Diligence', NULL, NULL, '2026-03-02 00:39:42', '2026-03-02 00:39:42', 'approved', NULL, NULL);
INSERT INTO `teachers` VALUES ('6', 'lisa_garcia', 'Lisa', 'Garcia', 'Lisa', 'lisa.garcia@wmsu.edu.ph', '$2a$12$wUAoPYlFLjKMDeE.KC7my.uepP4TAhBkpKOwBSvX6bEtOB6Kx8Y9K', 'adviser', '["GMRC","Mathematics","Filipino"]', 'Grade 5', 'Wisdom', '', NULL, '2026-03-02 00:39:47', '2026-03-02 02:26:03', 'approved', NULL, NULL);
INSERT INTO `teachers` VALUES ('337', 'sophia_lee', 'Sophia', 'Lee', 'Sophia', 'sophia.lee@wmsu.edu.ph', '$2a$12$rjHocTZm8ILPTZHrkl/m5um1xx6yzsO9jF1yY.rw2d524hh69q/Ky', 'adviser', '["GMRC","Reading","Mathematics","Makabansa"]', 'Grade 2', 'Kindness', NULL, NULL, '2026-03-02 00:39:44', '2026-03-02 00:39:44', 'approved', NULL, NULL);
INSERT INTO `teachers` VALUES ('3569', 'david_miller', 'David', 'Miller', 'David', 'david.miller@wmsu.edu.ph', '$2a$12$.GmL2xu8B0j7MbbclfccoOj/wN1sFzAa0oDMC0oRYLbmgVgV/AQE2', 'subject_teacher', '["Filipino","English","Science","MAPEH"]', 'Grade 6', 'Diligence', NULL, NULL, '2026-03-02 00:39:46', '2026-03-02 00:39:46', 'approved', NULL, NULL);
INSERT INTO `teachers` VALUES ('69371', 'james_wilson', 'James', 'Wilson', 'James', 'james.wilson@wmsu.edu.ph', '$2a$12$Omc1ZZ2LL6.rRhCLHA/Fxe9waREcQp4vJTXqglghT16LY2Pdesyr.', 'subject_teacher', '["ArPan","Science","Mathematics"]', 'Grade 4', 'Diligence', NULL, NULL, '2026-03-02 00:39:47', '2026-03-02 00:39:47', 'approved', NULL, NULL);
INSERT INTO `teachers` VALUES ('849800000', 'ana_reyes', 'Ana', 'Reyes', 'Ana', 'ana.reyes@wmsu.edu.ph', '$2a$12$rk/nWayXlZEPsuJ0EUjk/.kwZS0pUGiP0gM0VQ5J5xsX3NEyUnTz.', 'adviser', '["GMRC","Filipino","Mathematics","Makabansa"]', 'Grade 4', 'Wisdom', NULL, NULL, '2026-03-02 00:39:42', '2026-03-02 00:39:42', 'approved', NULL, NULL);
INSERT INTO `teachers` VALUES ('849800001', 'michael_brown', 'Michael', 'Brown', 'Michael', 'michael.brown@wmsu.edu.ph', '$2a$12$oxWzp20wBM83KQmnOz/m0.Z/Re8DVkPTbylZhxBja5tynvVOacueq', 'adviser', '["GMRC","Language","Mathematics"]', 'Grade 1', 'Humility', NULL, NULL, '2026-03-02 00:39:44', '2026-03-02 00:39:44', 'approved', NULL, NULL);
INSERT INTO `teachers` VALUES ('849800002', 'emily_johnson', 'Emily', 'Johnson', 'Emily', 'emily.johnson@wmsu.edu.ph', '$2a$12$uqIb8Ngx8yfTevFhFWmsHOcBnFPYYcwfrJP9ukcILPlo17pJ9ZKCS', 'adviser', NULL, 'Kindergarten', 'Love', 'Numbers', NULL, '2026-03-02 00:39:45', '2026-03-02 02:26:18', 'approved', NULL, NULL);
INSERT INTO `teachers` VALUES ('849800003', 'aaaa', 'aaa', 'ddd', 'ffff', 'gggg@wmsu.edu.ph', '$2a$12$eTiwaSGqYIwKIvYpPzaaDeijO2uI8vTO2ap2QeYITrxhmGouBIPzW', 'adviser', '["GMRC","Reading","Makabansa","Language"]', 'Grade 1', 'Humility', 'ggg', '/teacher_profiles/teacher_1772383462536.png', '2026-03-02 00:44:29', '2026-03-02 03:17:27', 'rejected', 'ddddd', NULL);


-- Table: users
CREATE TABLE `users` (
  `id` varchar(36) NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `username` varchar(100) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(50) DEFAULT 'admin',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `phone` varchar(20) DEFAULT '',
  `profile_pic` longtext DEFAULT NULL,
  `googleId` varchar(255) DEFAULT NULL,
  `avatar` longtext DEFAULT NULL,
  `name` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Data for table: users
INSERT INTO `users` VALUES ('01873780-269e-4345-9d01-d45b8f347f78', 'Local', 'Admin', 'localadmin_', 'admin_local@wmsu.edu.ph', '$2a$12$TsqYtypv4xh/WYNpN8.hYekIX5LFvQgr..KJHB2UlnQthEW23Zw5O', 'admin', '2026-03-09 21:51:14', '2026-03-09 21:51:14', '', NULL, NULL, NULL, NULL);
INSERT INTO `users` VALUES ('354ad79a-2368-4490-99a2-bfb14d0e8a80', 'Ana', 'Lopez', 'ana.lopez', 'ana.lopez@wmsu.edu.ph', '$2a$12$JroPSPW.QS4yyAYplcK5V.d6UfoiGjzC6k2MofGvvTaSqD5lVv4Xa', 'student', '2026-03-10 23:40:29', '2026-03-10 23:40:29', '', NULL, NULL, NULL, NULL);
INSERT INTO `users` VALUES ('364ae62d-f942-4461-8294-fb5c24cd457a', 'Liza', 'Ramos', 'liza.ramos', 'liza.ramos@wmsu.edu.ph', '$2a$12$duqeV3eoy4fkdbhO1aOQgutklPCoAyE2g2kaaDWw9NcQS8nAJ.cZ6', 'student', '2026-03-10 23:40:34', '2026-03-10 23:40:34', '', NULL, NULL, NULL, NULL);
INSERT INTO `users` VALUES ('65cc7a29-06e2-4841-998e-3fafe9735f77', 'Maria', 'Santos', 'maria.santos', 'maria.santos@wmsu.edu.ph', '$2a$12$LkwaM7.a3nI6iZGAk9BN2uvEWUInoSuL/xdHqyWRVxBy9O2XFhRiK', 'student', '2026-03-10 23:40:26', '2026-03-10 23:40:26', '', NULL, NULL, NULL, NULL);
INSERT INTO `users` VALUES ('77ed769c-5221-4208-96fd-6e24f5b67200', 'Juan', 'Dela Cruz', 'juan.dela cruz', 'juan.dela cruz@wmsu.edu.ph', '$2a$12$knHAmfBggR6lBbEdyPBYAuJYZNPxLkCrzKV4O5PKpK0Ab1IpY6HVq', 'student', '2026-03-10 23:40:24', '2026-03-10 23:40:24', '', NULL, NULL, NULL, NULL);
INSERT INTO `users` VALUES ('8f37eeb9-2b28-49be-aad1-50ecec54abed', 'Mark', 'Cruz', 'mark.cruz', 'mark.cruz@wmsu.edu.ph', '$2a$12$DA7ANqreRr6HT8ImTLdDJuBI4dKpjlhKK4eqbDnp2neKzqtb5BIEu', 'student', '2026-03-10 23:40:32', '2026-03-10 23:40:32', '', NULL, NULL, NULL, NULL);
INSERT INTO `users` VALUES ('ced454da-6b46-483b-a955-285c63ff28ef', 'Carlos', 'Reyes', 'carlos.reyes', 'carlos.reyes@wmsu.edu.ph', '$2a$12$OGWqW1j3ORMor37gw9uKVeZQo8jCt9GGwSQ0aYc1geED4Rz.xnwJK', 'student', '2026-03-10 23:40:28', '2026-03-10 23:40:28', '', NULL, NULL, NULL, NULL);
INSERT INTO `users` VALUES ('d9fcae49-c0f1-401a-af5d-33384c59552c', 'Mintymin', 'Freshie', 'minty_min', 'minty@wmsu.edu.ph', '$2a$12$mCSk2bOgbWNTan6S/h2iX.8FgNqbgj5LdTT3.PSL5D0gkDeHKRn.u', 'admin', '2026-03-01 16:18:58', '2026-03-01 19:28:46', '0909090909', '/admin_profiles/profile_d9fcae49-c0f1-401a-af5d-33384c59552c_1772364524841.png', NULL, NULL, NULL);

