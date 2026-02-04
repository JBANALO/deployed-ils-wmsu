-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 01, 2026 at 06:14 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `wmsu_ed`
--

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` varchar(50) NOT NULL,
  `firstName` varchar(100) NOT NULL,
  `lastName` varchar(100) NOT NULL,
  `username` varchar(100) NOT NULL,
  `role` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `firstName`, `lastName`, `username`, `role`, `email`, `password`, `createdAt`) VALUES
('0182227e-bb87-443c-837b-338147fbc649', 'Jaydin Belleana', 'Enguerra', 'jaydin belleana.enguerra', 'student', 'jaydin belleana.enguerra@wmsu.edu.ph', '$2a$12$R/cEzxW5VNZVrkGeVL49bOK1auTk6GqibI4YBZxUMAQIun.yQ7UtK', '2026-02-01 05:03:13'),
('0212df62-ed83-46cb-b7ad-b2098b029c6d', 'Ameerah Caitlynne Augusta', 'Escorial', 'ameerah caitlynne augusta.escorial', 'student', 'ameerah caitlynne augusta.escorial@wmsu.edu.ph', '$2a$12$oFpU1Z71iFqKsddAxcGtEuKL9IKkXNsEOYi3Lb9ulM/L3eqgvK6re', '2026-02-01 05:02:52'),
('02d5353f-39f8-4358-bcd9-017490e743ac', 'Althea Chryzelle', 'Dela Cruz', 'althea chryzelle.dela cruz', 'student', 'althea chryzelle.dela cruz@wmsu.edu.ph', '$2a$12$PA9KEYjregq32BBWXjKG6.g6DFoznmnPXyE4GuiNQXAgWIsvBodbG', '2026-02-01 05:03:11'),
('054f6977-37ac-49a9-bad0-addba4af2636', 'Fatima Khadiza', 'Hadjani', 'fatima khadiza.hadjani', 'student', 'fatima khadiza.hadjani@wmsu.edu.ph', '$2a$12$qikDJfQQgcofX.Rv5KjXFuVOQrpDCSOwQSZNfhZxVqAhVM9FKnkQq', '2026-02-01 05:02:54'),
('06ea6408-5317-4d81-94f5-259f40dc7440', 'Matthew Xander', 'Alacre', 'matthew xander.alacre', 'student', 'matthew xander.alacre@wmsu.edu.ph', '$2a$12$1J6REZ.moc48tohaqu9Hee0g5AYQcc3Isgfkb27aNHeRHaWPWJKmq', '2026-02-01 05:02:17'),
('0a8c448c-7888-483a-b15f-9e21494ed779', 'Safia-Zahra', 'Isahac', 'safia-zahra.isahac', 'student', 'safia-zahra.isahac@wmsu.edu.ph', '$2a$12$gEZJaRm.RRpNWjeeHVOZSe2mPdu9nP8.nT2O7KJCzLkIh3Y2RCP6m', '2026-02-01 05:02:30'),
('0c1e2fce-788b-47bb-a5be-ec70f7a92e08', 'Queen Cess-Skyler', 'Pansib', 'queen cess-skyler.pansib', 'student', 'queen cess-skyler.pansib@wmsu.edu.ph', '$2a$12$OXuU6aJpv0eEfaDytt.pDeWh6tQsXRb1.3Kn9kIxibCMsPjmM10X.', '2026-02-01 05:02:33'),
('14275032-f45d-47d2-85c5-594126c05849', 'Angelina Graciela', 'Magangit', 'angelina graciela.magangit', 'student', 'angelina graciela.magangit@wmsu.edu.ph', '$2a$12$.WEq8QFj.yqKkEtHXrTfbehO790R39Z5rIKljnYUiacFOyq9E0Uuy', '2026-02-01 05:03:15'),
('156b0188-1608-448a-adb9-19797e590561', 'Aaleyah', 'Jumahari', 'aaleyah.jumahari', 'student', 'aaleyah.jumahari@wmsu.edu.ph', '$2a$12$1gnJI.JdqV/SdHRAa9y83uODeK0WV0hFGtHU/HKbLNfNDq9V.oHfa', '2026-02-01 05:02:56'),
('161687f8-7301-44f9-b656-405d5c81d49c', 'Shayma Shillan', 'Alejano', 'shayma shillan.alejano', 'student', 'shayma shillan.alejano@wmsu.edu.ph', '$2a$12$Zv6ZnHDlReJ2UfVbzjpi/eUBu3oaplaaeVb6owgkpZbtNlTZuC/Cm', '2026-02-01 05:02:27'),
('167127aa-168b-4d3f-92a4-16f054e5245a', 'Terence Jaohrian', 'Lagua', 'terence jaohrian.lagua', 'student', 'terence jaohrian.lagua@wmsu.edu.ph', '$2a$12$0sRLDg3xf/814xUTRUbTCeu.J23uXRosn9FEGNEtlOCrscY2nYn9q', '2026-02-01 05:02:44'),
('18170075-32cd-4d69-b90b-7e00e4b5dd21', 'Darlyn Rein', 'Borja', 'darlyn rein.borja', 'student', 'darlyn rein.borja@wmsu.edu.ph', '$2a$12$jlI1UwUx1GQNkgtCtYOekO2B/CF7RWLj9a8TRR4d956.uPYhVylq.', '2026-02-01 05:03:11'),
('1a0171f7-34c9-449b-915e-e118c90fc239', 'Mikhail Kyle', 'Raveche', 'mikhail kyle.raveche', 'student', 'mikhail kyle.raveche@wmsu.edu.ph', '$2a$12$AjgfN2LThZ/cBHAwOFRg0u0p7W4zOYmEj9.MWx4yAhU0eifRgA3PO', '2026-02-01 05:02:46'),
('1a3b50bd-9281-49dc-805b-1c617cdbd57e', 'Xian Jaster', 'Sayadi', 'xian jaster.sayadi', 'student', 'xian jaster.sayadi@wmsu.edu.ph', '$2a$12$s6VUGcEetZFga0R9COVD0eq83Ft6uA0ua/r.jk.o.su6.WBMDQXvu', '2026-02-01 05:02:47'),
('1ae2cf80-7a2e-4340-b087-5ddd56f5359b', 'Kienna', 'Lagomera', 'kienna.lagomera', 'student', 'kienna.lagomera@wmsu.edu.ph', '$2a$12$0.MpGL17l7tx8H15by9IquA3pQLJ9ZAYzV24cIEoGcRVcFNUzC28y', '2026-02-01 05:03:14'),
('1c79ff8d-374d-437e-a9a2-4fe91a45380e', 'Jazzmon Yousef', 'Loquias', 'jazzmon yousef.loquias', 'student', 'jazzmon yousef.loquias@wmsu.edu.ph', '$2a$12$MgUl4LiRfn5hf9fIasmjz.LljleBy2DOGxJeCEfIa5GoAfC/GlKGu', '2026-02-01 05:02:23'),
('1e329741-e76c-430b-9d9c-53ea2cbc7ccf', 'Xyrrah Mae', 'BeraÃ±a', 'xyrrah mae.beraã±a', 'student', 'xyrrah mae.beraã±a@wmsu.edu.ph', '$2a$12$mCquhoMn/9SCmtSLuIiWPOZ1.GrLxzLZgjoW/NzlkC5OxNk2A/TLC', '2026-02-01 05:02:28'),
('1edb21ab-188b-4121-99f5-4bec67dc9459', 'Leone', 'Dacumos', 'leone.dacumos', 'student', 'leone.dacumos@wmsu.edu.ph', '$2a$12$RI2It2gl0bkb9Wr7JILBVu6mQBKtOsGzyr7FLvvHvSvkDDacQoyom', '2026-02-01 05:02:41'),
('1eff50aa-4458-4f56-8512-f222607a8df4', 'Zabina Nicole', 'Regalado', 'zabina nicole.regalado', 'student', 'zabina nicole.regalado@wmsu.edu.ph', '$2a$12$SfgJZyeaZt6.jrEHzD8dhOw4bcDulFkf3mxewF4V.N47VlPF/6zJG', '2026-02-01 05:03:17'),
('2070f5b4-2dcb-42b3-9318-d75871f46fd5', 'Shariffa Sara', 'Hadjirul', 'shariffa sara.hadjirul', 'student', 'shariffa sara.hadjirul@wmsu.edu.ph', '$2a$12$eTslSqy5dHUNMnmBLWlTv.RRGKvti1dRjdtgBMwxtpINhGkECD/sS', '2026-02-01 05:02:08'),
('27cac543-7a5a-4b3e-bafb-094dda002622', 'Elysha', 'Grajo', 'elysha.grajo', 'student', 'elysha.grajo@wmsu.edu.ph', '$2a$12$dTDa4lBlmGb5C1CIQGlceu493ZKlBz1jX0UcuMWoYJhwoEIFkknbe', '2026-02-01 05:02:53'),
('2b10b7ed-ec25-4d7d-98bc-5e4b005cab2d', 'Reham', 'Madja', 'reham.madja', 'student', 'reham.madja@wmsu.edu.ph', '$2a$12$lyKnr1DhYSKlfhcWvrtHoOySWVMSdhbGrJSNyLZS5d58FxkmH2XFy', '2026-02-01 05:03:15'),
('2c937d21-69f2-4760-a4c3-09ea3d5806aa', 'Erica Jayzel', 'Suegay', 'erica jayzel.suegay', 'student', 'erica jayzel.suegay@wmsu.edu.ph', '$2a$12$BbX2E79YoD5w3Py9a82mG.N1m59cfbvunYSKzN/hTyq.gSi0gt79G', '2026-02-01 05:03:18'),
('331695e7-f358-420a-9c34-1061342d6692', 'Ayesha Noor', 'Ope', 'ayesha noor.ope', 'student', 'ayesha noor.ope@wmsu.edu.ph', '$2a$12$gQEr/GiXAMZ9kSwUWzVIh.QQ9ldizsdWjxzghPOoJ7ESrjZ6R9q/u', '2026-02-01 05:03:17'),
('33925364-9cdd-4e5f-8ff6-04819eeaa1ea', 'Corin Jol', 'Hermosilla', 'corin jol.hermosilla', 'student', 'corin jol.hermosilla@wmsu.edu.ph', '$2a$12$YX6Rjz7XC8v.7dzdzknoB.x7uIBhJkDiyaXAbTgMonD80yzshdUB6', '2026-02-01 05:02:43'),
('3588249d-09ab-4e71-a084-d0baac60383f', 'Mary Franz Jannea', 'Tabal', 'mary franz jannea.tabal', 'student', 'mary franz jannea.tabal@wmsu.edu.ph', '$2a$12$49OTuhye8uYypDaAHnjCTu120X3X/ruZywzMgTo3bc.8A9PJ4ppyq', '2026-02-01 05:02:38'),
('35a6eb50-b609-4311-b460-5e53a83578ff', 'Lateefa', 'Jamiri', 'lateefa.jamiri', 'student', 'lateefa.jamiri@wmsu.edu.ph', '$2a$12$42/UFqou4MrLS8I8pgr2Q.nAED/b8EKsj9JH/E4.prGlP55UVFOY2', '2026-02-01 05:02:55'),
('375fad3d-ee9c-4b4a-9f45-296be8db3fca', 'Arthea Gaea', 'Candido', 'arthea gaea.candido', 'student', 'arthea gaea.candido@wmsu.edu.ph', '$2a$12$C/o/grYtgH4q11sKlyNe6uJ3ZA6EEbuRM2RhOlMjL6ZFLHmc5mtH2', '2026-02-01 05:02:05'),
('37dfe178-8bef-4531-bc5b-32a2a272fc51', 'Charlize Belle', 'Lastimoso', 'charlize belle.lastimoso', 'student', 'charlize belle.lastimoso@wmsu.edu.ph', '$2a$12$/gY8oTK/fwzlYp/jicMnZOgYOZ7N76zZ.ptaI0S2a/8b7i1y92sKS', '2026-02-01 05:02:31'),
('3895d7cb-15b4-4601-a07e-949c412371ff', 'Yzhimie', 'Dua', 'yzhimie.dua', 'student', 'yzhimie.dua@wmsu.edu.ph', '$2a$12$rtGG.wIuQ2/JVr/CMvWRz.YU628v9Xxco1BBvJp/TOWK4G2KWexum', '2026-02-01 05:02:52'),
('3cb5a22a-45a7-4b8a-9724-95bed46b781c', 'Maxine Therese', 'Ramos', 'maxine therese.ramos', 'student', 'maxine therese.ramos@wmsu.edu.ph', '$2a$12$VniHS1aKejxsgX/SONxbEO1W1k3T0uslez.E9URNti7z3LnRKcAwO', '2026-02-01 05:02:34'),
('4100ac00-f1df-4225-89c3-5507a9129f8b', 'Cid Raeed', 'Aranan', 'cid raeed.aranan', 'student', 'cid raeed.aranan@wmsu.edu.ph', '$2a$12$GmWaD8j8aOqOgfObY7Grj.TM9uMEqsQevRr0QywZc9jkGF1P5D7ky', '2026-02-01 05:02:18'),
('416b5b40-a734-47d2-9c4d-e78d39e723b1', 'Alexis Katarina Maureen', 'Saavedra', 'alexis katarina maureen.saavedra', 'student', 'alexis katarina maureen.saavedra@wmsu.edu.ph', '$2a$12$PIGRBFZA8b/QD0CiW6v2geD9y2IF58bdJw8iIVJv1qLSgQoSpIjXi', '2026-02-01 05:03:19'),
('416d6a99-f171-4db0-997d-74cc0c54a588', 'Nurjihay', 'Ahiyal', 'nurjihay.ahiyal', 'student', 'nurjihay.ahiyal@wmsu.edu.ph', '$2a$12$gRrqCRDq6XMofv6VVL.ad.ZoRCre8cSzXuPX9md1RmevjihVHobFK', '2026-02-01 05:02:48'),
('43301837-97e2-493f-beda-8f69f1b14fd8', 'Zhayra', 'Sarail', 'zhayra.sarail', 'student', 'zhayra.sarail@wmsu.edu.ph', '$2a$12$1T9lFPls100voZaN3.AW5O0urhb3RKL8CObCsYne7MpMV0QZwiaM6', '2026-02-01 05:02:36'),
('4350b2cf-b4ea-4835-84b1-9f5afe7d5aa0', 'Norrizah', 'Ali', 'norrizah.ali', 'student', 'norrizah.ali@wmsu.edu.ph', '$2a$12$GQXUodI0GZXQ8PRJZgaVOOvnX3WN1dtWCpEmAfWi2eYtT4uD/zxLO', '2026-02-01 05:02:27'),
('44672fa0-5fc6-4313-b407-e5b13f141989', 'Winter Kaillen', 'Saavedra', 'winter kaillen.saavedra', 'student', 'winter kaillen.saavedra@wmsu.edu.ph', '$2a$12$FuyVr1K/nU.cn/jQJ6mg7.c1x0Ru3..zmwE0opZsXOfn2BW8A3rte', '2026-02-01 05:02:58'),
('46bcd158-14bc-46e5-a5f6-840fd5cd3bd0', 'Sharifa Majeeya', 'Buttongah', 'sharifa majeeya.buttongah', 'student', 'sharifa majeeya.buttongah@wmsu.edu.ph', '$2a$12$ZaCWHFaxMNk2RIKzoSwbteJA31ygFQiZKaYvNPWXyFBQyLJqnprWO', '2026-02-01 05:02:04'),
('497846d3-3f7e-4d02-a8d0-1e687f66e070', 'Caileb Ynjel', 'De Sosa', 'caileb ynjel.de sosa', 'student', 'caileb ynjel.de sosa@wmsu.edu.ph', '$2a$12$CRYMPE1wFTT36ErgTFZAaeUovyvhUEZUlL76OT572ttf9xJ3NxgUm', '2026-02-01 05:02:51'),
('4b94eb1a-2724-4faa-a796-49b4a77727a4', 'Kafden', 'Encilay', 'kafden.encilay', 'student', 'kafden.encilay@wmsu.edu.ph', '$2a$12$T6SnG0P0PuoMkYGDjDDy3O.OFFT1vYE7wg1rju6XWS/NfI8j8G4qe', '2026-02-01 05:01:58'),
('4d8f1ba5-90a8-4481-8b93-c1aa2596b957', 'Safiyya', 'Hajan', 'safiyya.hajan', 'student', 'safiyya.hajan@wmsu.edu.ph', '$2a$12$rLD0LKmN1JwZHgqHDg8AZujGnjv7Q8VR7MyVMhsuwV3G3RohW1jaW', '2026-02-01 05:02:09'),
('4e06fa23-c278-4fbf-8278-980210fb6311', 'Elisha Blaire', 'Morallo', 'elisha blaire.morallo', 'student', 'elisha blaire.morallo@wmsu.edu.ph', '$2a$12$ap0Jgm3MMPii3BxtmzxAS.TiC4krAwMKUhA5UYOvO0cam.j9HcMMG', '2026-02-01 05:03:16'),
('513e8e1d-6d61-48f1-adfe-1c6cfb433c5c', 'Ayessha', 'Tawasil', 'ayessha.tawasil', 'student', 'ayessha.tawasil@wmsu.edu.ph', '$2a$12$srWdCuLguKGeDYeC6UB61.ELPRFeyl7RL0FGSLDC87JTepBcsWstW', '2026-02-01 05:02:15'),
('55436428-a9d1-4c55-9bfd-4170f2472896', 'Ralf Angelo', 'Llacuna', 'ralf angelo.llacuna', 'student', 'ralf angelo.llacuna@wmsu.edu.ph', '$2a$12$7CV9N3v2MPPW1F/st.lRPuknKhuk8O6pe53EjWFBcFVhvuq5FssAe', '2026-02-01 05:02:02'),
('571a76b1-b0cc-4bc4-9a54-84319d14de70', 'Sofia Belle', 'Rodriguez', 'sofia belle.rodriguez', 'student', 'sofia belle.rodriguez@wmsu.edu.ph', '$2a$12$UECtAr3I/NYtPrk6jerjQuG3N/C7EnyszhnKFBq232P3bOUmoJnZC', '2026-02-01 05:03:18'),
('582046fd-fba8-4dfa-8bb7-f2f76c1b2f3f', 'Mohanned Rafi', 'Bravo', 'mohanned rafi.bravo', 'student', 'mohanned rafi.bravo@wmsu.edu.ph', '$2a$12$Ro9VwoCr16gOQFIBkD9YrODnb.3ddBz0ro3D6yTQO0/gC5HJciD5W', '2026-02-01 05:02:40'),
('586290ce-1e03-4fa9-a018-1d92ec144812', 'Muhammad Wadood', 'Jamiri', 'muhammad wadood.jamiri', 'student', 'muhammad wadood.jamiri@wmsu.edu.ph', '$2a$12$T8tpHBtCXzTRafcq.vTsV.mRqh6YYFcLQPLZkzPFeWNlfiiLbMiru', '2026-02-01 05:02:22'),
('59c27d05-5796-4aaf-ab17-5eec69799ad2', 'Ashton Riley', 'Bughao', 'ashton riley.bughao', 'student', 'ashton riley.bughao@wmsu.edu.ph', '$2a$12$tTq.2erNFEZl/3ZknYRDgeBTUFA5Fwv/DIQ9tPs4M1oTY9krW5SyW', '2026-02-01 05:03:09'),
('5a4d55aa-a236-4729-9701-c06a358269aa', 'Nurjanah', 'Tangkian', 'nurjanah.tangkian', 'student', 'nurjanah.tangkian@wmsu.edu.ph', '$2a$12$XZjpcEegT0uqzjoTnm3RLOAjnO1XR3aSuBpjXEEytDd24Y0Iw/0Ru', '2026-02-01 05:02:15'),
('5ad7d8cc-d37d-46be-8fc6-aae26a47b047', 'Mujahidah', 'Abdulkarim', 'mujahidah.abdulkarim', 'student', 'mujahidah.abdulkarim@wmsu.edu.ph', '$2a$12$NGxJKXWTwNoKH6.0WtQ1KOWQpSvNDn7mYj87h8d67Q1vl.boykQSe', '2026-02-01 05:03:10'),
('5b456dba-cafe-4a1f-89e3-f2ac5ebbed9d', 'Miel Acetherielle', 'Ocampo', 'miel acetherielle.ocampo', 'student', 'miel acetherielle.ocampo@wmsu.edu.ph', '$2a$12$caSfINoKqfNwestauMXIP.FUflfBnq1T3MPHEce44L5ypqm2tAMLO', '2026-02-01 05:03:16'),
('5b67eb7a-d130-4c16-b54e-4b8fd3e697f0', 'Mohammad Indanan Jr.', 'Jasani', 'mohammad indanan jr..jasani', 'student', 'mohammad indanan jr..jasani@wmsu.edu.ph', '$2a$12$5dHyQprdk3zPWGtGRpSPHO9E7LzIFBtid1KHcXpIQrrjpKJ2FyVPO', '2026-02-01 05:02:01'),
('5c76a29b-a115-476e-8a74-b8dba78c0bf8', 'Noor-Pearldausha', 'Saluan', 'noor-pearldausha.saluan', 'student', 'noor-pearldausha.saluan@wmsu.edu.ph', '$2a$12$pXK8nOl10P6Vr9oDcEhX8.5u75RaCI/a.YBEEwABJ16FwiJgKA8mW', '2026-02-01 05:02:59'),
('5db9558c-b13a-48b1-ac8e-55aa6ad2b63c', 'Pia Angela', 'Torres', 'pia angela.torres', 'student', 'pia angela.torres@wmsu.edu.ph', '$2a$12$3V9.vzIbFPSReLjFpNQbNedG3KQms4v08Y13lAio29gMMJwneog6u', '2026-02-01 05:03:00'),
('5e98ea24-4ea5-4202-a862-08cca516660f', 'Kierra Rafa', 'Reyes', 'kierra rafa.reyes', 'student', 'kierra rafa.reyes@wmsu.edu.ph', '$2a$12$929WigsRuQvrIhsfJpZBUOvTPpQbfh2Y2wfHfS/s1E5j0rJNC3Khi', '2026-02-01 05:02:36'),
('6305f85a-fcce-42d8-8ff9-99dbf510d281', 'Ahyan Shazeef', 'Ibrahim', 'ahyan shazeef.ibrahim', 'student', 'ahyan shazeef.ibrahim@wmsu.edu.ph', '$2a$12$Qn4id3zTVy.Fgj4hrSnEc.0t655Cdk8mtYTWJp/ljHTOCBzfUj1xO', '2026-02-01 05:02:20'),
('639ba852-e2a5-49a1-9aef-1d7ae976f101', 'Rieza L. III', 'Kinang', 'rieza l. iii.kinang', 'student', 'rieza l. iii.kinang@wmsu.edu.ph', '$2a$12$2Dbn08aHURjOqnY2xXoc.uxKwTBucIm2rx7ZqZLADdXDW028Kc9b2', '2026-02-01 05:02:01'),
('63e5aef4-8ae5-4ea6-ace5-26deb257515a', 'Abdurazaq', 'Sawadi', 'abdurazaq.sawadi', 'student', 'abdurazaq.sawadi@wmsu.edu.ph', '$2a$12$LD8wXB7/CbHEvey51W1BTeMDoH1lP9fKoEwSGB21IGD8EaSLKwbFK', '2026-02-01 05:03:07'),
('663ac80d-8222-42b2-9c40-7f1b242f8488', 'Ezra Zobrist', 'Pobre', 'ezra zobrist.pobre', 'student', 'ezra zobrist.pobre@wmsu.edu.ph', '$2a$12$f51ij6SOZe7iKpSo8Wc2se2u6fcXDsBM5/nSMuVDxM/gIikQcRcGK', '2026-02-01 05:02:03'),
('676d2374-a9e9-40c0-a22f-0d5852d44afb', 'Lien Blair', 'Estandarte', 'lien blair.estandarte', 'student', 'lien blair.estandarte@wmsu.edu.ph', '$2a$12$dqnzJOJD3FbHUW43MPTnBOIF3AAofhzHCwpQcViW4E6ST04crlVnK', '2026-02-01 05:02:06'),
('6ace9ac7-a095-4e66-bd53-143bfbce036e', 'J-Zhel', 'Toribio', 'j-zhel.toribio', 'student', 'j-zhel.toribio@wmsu.edu.ph', '$2a$12$ufpFrlbtRdxATApT2fWk5u12dvVSna1UoUaS1n/wJGOUedpeehCVO', '2026-02-01 05:03:00'),
('6ae55d67-9680-4d92-aca4-9c62fa4ca5c0', 'Meerkhan Deen', 'Karanain', 'meerkhan deen.karanain', 'student', 'meerkhan deen.karanain@wmsu.edu.ph', '$2a$12$suZ.MiGqQtMIeKCZhM9rf.RxR065yCYWVvWC0rD8HAqIAdPV1MRv6', '2026-02-01 05:03:04'),
('6bfa94a4-19bc-4b57-8ad5-06b28702e046', 'Julio Raphael', 'Sanson', 'julio raphael.sanson', 'student', 'julio raphael.sanson@wmsu.edu.ph', '$2a$12$d8pxuNYQMhSmNwpfiH3LTO/x0V7Zefdy./r34WXwvqJHjjEwMNmjS', '2026-02-01 05:03:06'),
('6cfd0cf8-3f23-490b-bdcb-6504d87e9689', 'Jannah', 'Larena', 'jannah.larena', 'student', 'jannah.larena@wmsu.edu.ph', '$2a$12$AzIHi/odFGjriCI/ewJweuQOsIxmaMTQ5Km6R.CzDxxju35xwj8Qe', '2026-02-01 05:02:11'),
('6e70d1e9-819f-468c-8442-e370b4de94f5', 'Shahirah Aishan', 'Rasid', 'shahirah aishan.rasid', 'student', 'shahirah aishan.rasid@wmsu.edu.ph', '$2a$12$dXhRVrcxzAgR2Nf/QFION.gWTxx6LQtQaxreve8grUcqkAQt32M8C', '2026-02-01 05:02:34'),
('706ede80-c8e1-4bb5-8f89-1728cc68969e', 'Nur Afsheen', 'Abdurajak', 'nur afsheen.abdurajak', 'student', 'nur afsheen.abdurajak@wmsu.edu.ph', '$2a$12$.eZqG/DCKi9DNnl5VVDMK.eXcUAV9aXQvDBh.go7y4dXLkukeVRde', '2026-02-01 05:02:26'),
('71616564-190f-4c5e-bd0a-061d7f292bc0', 'Callie Rae', 'Lubaton', 'callie rae.lubaton', 'student', 'callie rae.lubaton@wmsu.edu.ph', '$2a$12$C9dqSlr2sCDeHXnfagptzO55HqjCer/UZ4YB/pDcesOnXeCfgnlr2', '2026-02-01 05:02:57'),
('731b73b7-ad6f-4d32-b78e-b27e126455ac', 'Kazunari', 'Karasudani', 'kazunari.karasudani', 'student', 'kazunari.karasudani@wmsu.edu.ph', '$2a$12$t4nqvrKZVG91SByuW8PsUeUF203dXscOKImgl0ZCB0jc2YWgxtztK', '2026-02-01 05:03:10'),
('753c336c-7fb8-4136-bb20-ebd6c7222a9a', 'Estan-Matt Aron', 'Abad', 'estan-matt aron.abad', 'student', 'estan-matt aron.abad@wmsu.edu.ph', '$2a$12$94AYlWasGEVsiSxYEaM4mewy56mKz4vdH4ajFL4jjADpa5lAnAQLW', '2026-02-01 05:03:00'),
('77ce1e69-efd0-4735-93fd-49f46f2569fb', 'Scarlet Leigh', 'Cabangcala', 'scarlet leigh.cabangcala', 'student', 'scarlet leigh.cabangcala@wmsu.edu.ph', '$2a$12$MU60ErofHnsYtMrPee/Ueuz9lrdPbPF23llPv8rx6OERYwXL/fEjm', '2026-02-01 05:02:51'),
('77f33363-ab23-4097-9dcb-bfb716509f4d', 'John Mc-Reen', 'Sailabbi', 'john mc-reen.sailabbi', 'student', 'john mc-reen.sailabbi@wmsu.edu.ph', '$2a$12$gLFs9MtJoaCcarhI6W1CMu3OMf9vmAm3tKRrhZinKolFCGKDMF/tC', '2026-02-01 05:02:24'),
('788e743a-fc8a-43a3-910c-47d038b83574', 'Rieu Andrei', 'Burlas', 'rieu andrei.burlas', 'student', 'rieu andrei.burlas@wmsu.edu.ph', '$2a$12$3BZhq0gbBOMZqsnFOj8s.O0ynaaPSFfnjLdjFiqvF/o6xRpl2iyZ6', '2026-02-01 05:03:03'),
('79e2025f-3dc3-4c8f-b3f4-137be70243c6', 'Khayran Zein', 'Nasing', 'khayran zein.nasing', 'student', 'khayran zein.nasing@wmsu.edu.ph', '$2a$12$ac/3LZYj5bMAFibyRkWxZ.CN5Kv7Q9sHz03aQ2P2julBggzI84NEi', '2026-02-01 05:02:45'),
('7eac66b4-0014-468d-80b8-87c81ce2fb8c', 'Rasul', 'Abubakar', 'rasul.abubakar', 'student', 'rasul.abubakar@wmsu.edu.ph', '$2a$12$m0x/czPB9My925S7loQQ5uQvzSeZYC5AesGQ.gJVqmBMXN822Sapa', '2026-02-01 05:03:01'),
('7f40ccca-fbc5-4bb7-94e0-4750caff9b2c', 'Arjunnur', 'De Ocampo', 'arjunnur.de ocampo', 'student', 'arjunnur.de ocampo@wmsu.edu.ph', '$2a$12$HhmGyaCzE3zS8460viLbXuhpVxPeZj4DD.UsWQVy0siYltXJ8eTTO', '2026-02-01 05:02:19'),
('7fde0f63-9f4d-4fe6-859a-aa29b2d92d22', 'Asiyah', 'Alamia', 'asiyah.alamia', 'student', 'asiyah.alamia@wmsu.edu.ph', '$2a$12$3YsqfOokrqy4Q1Url2TGJ.y6k1hptLm8/b9f2K97WgtlTOrKVCVoq', '2026-02-01 05:02:03'),
('845eadc2-841d-4b52-ad40-61af55a6cf7e', 'Julanne', 'Molina', 'julanne.molina', 'student', 'julanne.molina@wmsu.edu.ph', '$2a$12$nNeVqih1iaCwxVgqQf4Yee1PGuUG7C58euofdLAOtC7rUwN55mAVS', '2026-02-01 05:02:12'),
('8483300a-95e7-4300-a442-d193c3abc1f6', 'Jazeem', 'Irilis', 'jazeem.irilis', 'student', 'jazeem.irilis@wmsu.edu.ph', '$2a$12$zJ0D29LlbUD57ztSL8YcwuJYmr0GvJ6QVg9VYfG0ufMGnDJm6xtzq', '2026-02-01 05:02:21'),
('848de65c-06d4-4f8d-b87a-ece026cabfa6', 'Hasmier Khan', 'Kurais', 'hasmier khan.kurais', 'student', 'hasmier khan.kurais@wmsu.edu.ph', '$2a$12$eGKPPRewZMvof/VQR8R9OuUjjnAwO/R.F5v0OnggWuIQRH57/xLRC', '2026-02-01 05:03:05'),
('84976531-3c37-4bfe-a434-1d6fd7c9a739', 'Aisha Callista', 'Alvarez', 'aisha callista.alvarez', 'student', 'aisha callista.alvarez@wmsu.edu.ph', '$2a$12$XyFYmhOQnG72uoRHRAqLluHf6Tit0m.4Q7KLD9akMNSdnzHlBXBTC', '2026-02-01 05:02:49'),
('84a2b542-7de2-43a3-9921-4dac2468fbfd', 'Jioezenze Jaime', 'Villarama', 'jioezenze jaime.villarama', 'student', 'jioezenze jaime.villarama@wmsu.edu.ph', '$2a$12$dsIQvQt7kx56lBrEz4nzzelWXm/s3AuChz0ZWWmKXkujc21iTdoKq', '2026-02-01 05:02:16'),
('868fffe1-e5e0-4fb3-930e-5484a17a5b34', 'Meghan Faye', 'Macadami', 'meghan faye.macadami', 'student', 'meghan faye.macadami@wmsu.edu.ph', '$2a$12$rLZzYTZKjXjvR/nvS2D2Ae67er5MUaHtXgpqsvD8pR9ci2Q7v4qeW', '2026-02-01 05:02:32'),
('887e437e-e40e-42cb-a012-eb3ea0842eb5', 'Kris Aldrich', 'Capule', 'kris aldrich.capule', 'student', 'kris aldrich.capule@wmsu.edu.ph', '$2a$12$Xr40ah1qVy0Zy8adcvn6K.5FltiMenP83P6xjkNvzIC3PzzjOn29i', '2026-02-01 05:02:40'),
('892353f5-cfe8-433b-8dac-7726ab0fedb0', 'Shafiah', 'Jumdain', 'shafiah.jumdain', 'student', 'shafiah.jumdain@wmsu.edu.ph', '$2a$12$Jkkszpo08dAzlNjMbs2Cn.OqUMcUHqa10TaXEHLsnvm/oBpKUmIFa', '2026-02-01 05:02:10'),
('8a13efd6-ced9-4bb1-8687-216d79749870', 'Nalyn', 'Sapie', 'nalyn.sapie', 'student', 'nalyn.sapie@wmsu.edu.ph', '$2a$12$O5LRJVn2GNJUeaRRUI8m2eN53EQS0eWtAIJtBGoK1bxBOD9soYU9m', '2026-02-01 05:02:14'),
('8b90a826-1081-4594-8d2c-2bcbbf040f42', 'Aya Dionne', 'Sharif', 'aya dionne.sharif', 'student', 'aya dionne.sharif@wmsu.edu.ph', '$2a$12$jvl8QikLVK.jLiY2RyFbdepklN791RrhS11h3AfNSMTw.LYaWKLNe', '2026-02-01 05:02:37'),
('8f4acbcc-b99d-4b8f-bfb2-08e4ec37290e', 'Fatima Safreenah', 'Tapsi', 'fatima safreenah.tapsi', 'student', 'fatima safreenah.tapsi@wmsu.edu.ph', '$2a$12$sa6/id7irYgZzbiSIomuH.TcuS4CvCiZiayqkktQngRuCK8D1wgd2', '2026-02-01 05:02:59'),
('9199f454-889d-4302-95c9-7cd323fa290a', 'James Gabriel', 'Habil', 'james gabriel.habil', 'student', 'james gabriel.habil@wmsu.edu.ph', '$2a$12$uYQq44J16ZJXoi/PkoHUreejor873rBv/1Np90nMeuTMefeB9iMAK', '2026-02-01 05:01:59'),
('93132758-3f65-46c9-a703-46a44671735b', 'Al Shan', 'Lantaka', 'al shan.lantaka', 'student', 'al shan.lantaka@wmsu.edu.ph', '$2a$12$BJWQKXsVVNOIt8DejIirWekw4OaILHwC0njJoLdd2f9Px8wN.t/Ji', '2026-02-01 05:02:44'),
('93516c5b-f8ac-4b37-9c8c-93236ee08d4b', 'Fatima Zhierhana', 'Amil', 'fatima zhierhana.amil', 'student', 'fatima zhierhana.amil@wmsu.edu.ph', '$2a$12$VfaqJfHoUNkG0sOLrPXxee.iLJDIrCsIuoqjTA6Mf1wGAA8t9qYgq', '2026-02-01 05:02:50'),
('93d180dc-f513-4cc7-b360-5c9016e2a348', 'Sophie Aleeyah Ryne', 'Fabian', 'sophie aleeyah ryne.fabian', 'student', 'sophie aleeyah ryne.fabian@wmsu.edu.ph', '$2a$12$guMQaN0.lnDwK7JkvUQMRegbW1SI0fE.h.duUwu6231Z1DeXfY1dK', '2026-02-01 05:02:29'),
('94ca63ff-1226-4a39-b469-409de94591ac', 'Fareed Ashraf', 'Fernandez', 'fareed ashraf.fernandez', 'student', 'fareed ashraf.fernandez@wmsu.edu.ph', '$2a$12$ZRLED9DJOF0rSTJ.ILNsxePJDQggJSgp.j8yT7oEyhXXgNna/vHW6', '2026-02-01 05:01:58'),
('95b71569-2110-476e-9fc1-7b99e33c1c17', 'Magnus Jury', 'Tandoy', 'magnus jury.tandoy', 'student', 'magnus jury.tandoy@wmsu.edu.ph', '$2a$12$s8F0aWQm9vzo7Yeg26EKjeP1ixVEOVXBQV3./RIlYUxPPC1hx1/oC', '2026-02-01 05:02:25'),
('97d78aa1-af71-4fe2-ad4a-c3584b6459f2', 'Josie', 'Banalo', 'jossie', 'admin', 'adminjossie@wmsu.edu.ph', '$2b$12$q10CO7iLzzqmCWk8DjieSusCZou4Tfz9jHfJnLWH72a6bk4reFScW', '2025-12-22 15:18:07'),
('990dd1c4-3abe-45e6-80c0-f8b9b3eaea74', 'Syraiqul', 'Malali', 'syraiqul.malali', 'student', 'syraiqul.malali@wmsu.edu.ph', '$2a$12$ShdQXONl.ux.A68Gwrk4VuOyjVNz6EhpEtHhry1wOhJuAQhrWeLza', '2026-02-01 05:02:02'),
('994c14b8-b372-4b58-95b5-fcd2b4ea8558', 'Kienna Rafaela', 'Reyes', 'kienna rafaela.reyes', 'student', 'kienna rafaela.reyes@wmsu.edu.ph', '$2a$12$nkmHEWfBInuznwa3o4k0jujXXSbKpli0w7e.JPxPUYwQub5QRu/Uq', '2026-02-01 05:02:35'),
('9a2cf5c8-c516-43ab-90a8-b8107890c25f', 'Muhammad Omor', 'Ahmad', 'muhammad omor.ahmad', 'student', 'muhammad omor.ahmad@wmsu.edu.ph', '$2a$12$DtpxfADKyzl8jeQOQknHwepZQQqlO2CuZvdDOIy1GyMNA8IXxjUTO', '2026-02-01 05:01:57'),
('9bc16495-bc51-4add-a4c4-5493de38e47d', 'Ali-Muzaffar', 'Sacay', 'ali-muzaffar.sacay', 'student', 'ali-muzaffar.sacay@wmsu.edu.ph', '$2a$12$9FHj9vHafbTqptomZ5YXAOoutzxJJkSFMk0eoyYHJ1OffQzwVznEO', '2026-02-01 05:02:03'),
('9d4fff2a-b18f-452d-b8fc-2f3e3fa77c74', 'Keira Emille', 'Natividad', 'keira emille.natividad', 'student', 'keira emille.natividad@wmsu.edu.ph', '$2a$12$THMOOKrn3Cptj9RnhkJd8u4c3XkQJyFnFYShAkAOh1PC5C.zLl0se', '2026-02-01 05:02:13'),
('9debbbd6-f23c-4016-8c8c-67e7ef86e293', 'Chris Matthew', 'Hernando', 'chris matthew.hernando', 'student', 'chris matthew.hernando@wmsu.edu.ph', '$2a$12$OxrGR1jc6JZ1FkMQzKCcseyVTkY1uRc9VR58qQ5GuLrvWPEvmMsma', '2026-02-01 05:02:00'),
('9e274b5f-c9b9-4386-89f0-769456af8f46', 'Atara', 'Hernandez', 'atara.hernandez', 'student', 'atara.hernandez@wmsu.edu.ph', '$2a$12$Golssqpyi3NGj/OWPaeoeuIopd5d4pl90C2q5/Ue7S1PxzDatrvd2', '2026-02-01 05:02:54'),
('a0acd5c7-5c1b-4e69-a00c-61e3649851f0', 'Icelestine', 'Binasoy', 'icelestine.binasoy', 'student', 'icelestine.binasoy@wmsu.edu.ph', '$2a$12$zMVimXdija.C8Du/hM0qy.XO2BYvqICk.jfHq3lsjyB8vAC6BISyK', '2026-02-01 05:02:50'),
('a17ef0f5-5d4f-46e8-8cf7-741d7da180f0', 'Chiara Vida', 'Florendo', 'chiara vida.florendo', 'student', 'chiara vida.florendo@wmsu.edu.ph', '$2a$12$8mj5vlRkP6E8LuSyQSTR4O5ikg2sSoEZT3CsgDP6eI8Ds0Dqc210q', '2026-02-01 05:02:53'),
('a20c1b2b-92dd-480c-96c6-f3e2c75b9fc1', 'Jazmeen Moira', 'Kamlian', 'jazmeen moira.kamlian', 'student', 'jazmeen moira.kamlian@wmsu.edu.ph', '$2a$12$T67gjZB.YUvOFWd2XFxhQu3gQ.JGaxBtlFN9gNTvMCB81pfIeuemC', '2026-02-01 05:02:56'),
('a2b27bed-c651-427c-9d60-b82884073351', 'Brayden Anaiah', 'Sinsuan', 'brayden anaiah.sinsuan', 'student', 'brayden anaiah.sinsuan@wmsu.edu.ph', '$2a$12$.oimpurij4o3QWYLnInRCetuXTy8Ntqc4pDeVpJPV0ptffUuuVSme', '2026-02-01 05:02:24'),
('a33d2b06-2130-447d-9eec-e59bda207680', 'Najeeb III', 'Abdulla', 'najeeb iii.abdulla', 'student', 'najeeb iii.abdulla@wmsu.edu.ph', '$2a$12$0IAZ6UmsmJ02ZNBViPff9.y4FC3bvATyBLgy1c6Q/wDCYr63/wBY6', '2026-02-01 05:02:38'),
('a5495839-46aa-42fe-a94a-57c0c021fb75', 'Fatima Raweeya', 'Quijano', 'fatima raweeya.quijano', 'student', 'fatima raweeya.quijano@wmsu.edu.ph', '$2a$12$IUSNkupjF.Co3C5o.uavtO4yVZCWMfG2NaPjhev0x020xOIE2iqWi', '2026-02-01 05:02:13'),
('a719ca4e-b33c-44cc-ba3d-ac8cea94cc7c', 'Avery Elise', 'Dinulos', 'avery elise.dinulos', 'student', 'avery elise.dinulos@wmsu.edu.ph', '$2a$12$s4nPyC0SEvtS0xZFO7JhG.1QE/HuVBK3GrqXnFqDJznMPX/ZapX6a', '2026-02-01 05:03:12'),
('a82896dc-c44c-4abc-a534-0da21a5c21a8', 'Maria Ysabella', 'Roxas', 'maria ysabella.roxas', 'student', 'maria ysabella.roxas@wmsu.edu.ph', '$2a$12$qYlagzgLN.0pXqdWaJek3eMiCsyxEP/IRCHWHOF1ENP2iHqYGa.Cm', '2026-02-01 05:02:58'),
('a8a426b1-e90d-43a5-a739-c68c4588ca07', 'Adriel', 'Yap Aizon', 'adriel.yap aizon', 'student', 'adriel.yap aizon@wmsu.edu.ph', '$2a$12$7qwWKZyNKXZfboh33fdX..5c9cbtWh5hrabRFyrIg1ipLQ2FFyHiO', '2026-02-01 05:02:25'),
('a9f2c603-2b2c-405a-ab3a-4856f61b4e6e', 'Amana', 'Jamahail', 'amana.jamahail', 'student', 'amana.jamahail@wmsu.edu.ph', '$2a$12$y1Um3eHBwpMcUJ2U394ha.rPZqpmeMAHX2PeI9tNSiSDW3VAwFXK6', '2026-02-01 05:02:09'),
('acff57e3-7e36-4c21-be24-7da8179a3cf5', 'Ruben C. II', 'Ho', 'ruben c. ii.ho', 'student', 'ruben c. ii.ho@wmsu.edu.ph', '$2a$12$d4gIA/mtZmdau9Xp3ACp.uA.1kq0bOXSwqZF4UJCXS2H2gj0nsl3O', '2026-02-01 05:02:00'),
('b07cc7db-4da8-445d-a526-45f4ea9f310f', 'Lunnor Jr.', 'Halipa', 'lunnor jr..halipa', 'student', 'lunnor jr..halipa@wmsu.edu.ph', '$2a$12$uvORiocPBLgyoTBdGQiJE.K3Ep.imLHc/z0G5m9KCtEInzQZa6NcG', '2026-02-01 05:03:03'),
('b25e4b43-20d7-4c44-b083-e4e0ca59324b', 'Mishael', 'Crisostomo', 'mishael.crisostomo', 'student', 'mishael.crisostomo@wmsu.edu.ph', '$2a$12$zNr56YpAf1c.ajk80M.zYO2ephyqHm.Lgn3oaq0pPSNpDejrNtCAa', '2026-02-01 05:02:05'),
('b38cd215-bb21-432f-b5ca-e714ed9c0f52', 'Zaara', 'Mohammed Yusuf', 'zaara.mohammed yusuf', 'student', 'zaara.mohammed yusuf@wmsu.edu.ph', '$2a$12$SXU2IGj0gXx.ug85rkFvyOOczHCEevNqxRSmRLKEOVkevyiRVBpE6', '2026-02-01 05:02:32'),
('b700d757-eed1-453f-a43c-17fa4478627b', 'Cesiah', 'Bautista', 'cesiah.bautista', 'student', 'cesiah.bautista@wmsu.edu.ph', '$2a$12$Ha/Ujq1dCewED0KfyYezwuNy0rqc0dt0nnfwH4UisqxvobOnhJgN.', '2026-02-01 05:02:28'),
('b8a6ea5f-4c3d-45e3-b7e0-fa3b76b2ff79', 'Liel Edzel', 'Wee', 'liel edzel.wee', 'student', 'liel edzel.wee@wmsu.edu.ph', '$2a$12$TURDpMLBT5etVJn7pVJYienqgHG69QNuKGUo0CE4sYg8ip8qIh.p.', '2026-02-01 05:02:48'),
('b95a2466-33ad-4d9e-9364-edf5dc338c2e', 'Shahid', 'Abdulkarim', 'shahid.abdulkarim', 'student', 'shahid.abdulkarim@wmsu.edu.ph', '$2a$12$ZO.i1yHXbe4eABls.9411.HFJIfrKauYsrLaEQu3SqYt/N9XNmRCC', '2026-02-01 05:01:57'),
('ba930204-ff2a-11f0-ac97-388d3d8f1ae5', 'Josie', 'Banalo', 'hz202305178', 'teacher', 'Hz202305178@wmsu.edu.ph', '$2a$12$R9h7cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss8KKUgQlzwiOHSm', '2026-02-01 04:59:01'),
('bdb1bda0-02eb-48c8-95b0-0811de74a3a5', 'Kiella Rafaela', 'Reyes', 'kiella rafaela.reyes', 'student', 'kiella rafaela.reyes@wmsu.edu.ph', '$2a$12$EJejGyU.mGu2uzYdPgwywub9eihrg8HGVuuBNlsIP.OD7klzqKTEG', '2026-02-01 05:02:35'),
('c14b9786-6be9-4d07-b2af-00c7a4580e40', 'Nurada', 'Sailabbi', 'nurada.sailabbi', 'student', 'nurada.sailabbi@wmsu.edu.ph', '$2a$12$uP.kvTFjvzkw.p9tscm4me77zDHk2Ty8VDrGSEvPQwh7/.2HKn1SS', '2026-02-01 05:02:14'),
('c335e60e-5c04-4f5d-ad66-9d1095cb4ebc', 'Nikuz Yenoh', 'Marcelino', 'nikuz yenoh.marcelino', 'student', 'nikuz yenoh.marcelino@wmsu.edu.ph', '$2a$12$jCGzm5H/KEdEmXcot.QGae3RvVPbb8u1g1DEpTYD6LueRIy2PwzrO', '2026-02-01 05:03:10'),
('c38dea90-cf73-44a3-be08-f451aca2104f', 'Aviya Emelie', 'Tan', 'aviya emelie.tan', 'student', 'aviya emelie.tan@wmsu.edu.ph', '$2a$12$44YaeXsy50Fi/rmk1qU0leooXBwI76L/4yZ2IQmVzUolmxHphFXbK', '2026-02-01 05:02:37'),
('c81567b5-d3a8-4113-8998-816d0faa5ad3', 'Gabriel Rile', 'Eleno', 'gabriel rile.eleno', 'student', 'gabriel rile.eleno@wmsu.edu.ph', '$2a$12$zRNTe4iGLqWYB2Ggk2T07euGmbiRYOkYXkt7i1DJCl1cvHOUwtphy', '2026-02-01 05:02:42'),
('c914a092-e18b-445f-b384-2a2c13353e60', 'Rania Mariae', 'Edding', 'rania mariae.edding', 'student', 'rania mariae.edding@wmsu.edu.ph', '$2a$12$cBdHmLG.cLK6lsvLl8BpMen27cJF51/ow.TA7f0FyGp6GwrI2IU2i', '2026-02-01 05:02:06'),
('ca9189d0-8c42-4bc7-9895-95fa702095ec', 'Yusreena', 'Edding', 'yusreena.edding', 'student', 'yusreena.edding@wmsu.edu.ph', '$2a$12$wU1uc4MDetGW98lWRWDAEuOhR8KkAh6cwHD/vm27Di1AOJQ7D0xWW', '2026-02-01 05:03:12'),
('cae34b89-d20a-4a64-8545-c1adc4fa3481', 'Reemah', 'Julwadi', 'reemah.julwadi', 'student', 'reemah.julwadi@wmsu.edu.ph', '$2a$12$higL59dcveX1d/..8vzGH.3mxiCNBCDH.YtQ7K8ZYkAcOEhP0Rl1i', '2026-02-01 05:02:31'),
('cb25c61e-4bd6-4661-ae79-9c4b61bb29ea', 'Elijah Peniel', 'Tarroza', 'elijah peniel.tarroza', 'student', 'elijah peniel.tarroza@wmsu.edu.ph', '$2a$12$2Rwin5WA5COLXcc1NDeNv.i7yuCqPOFN9FvN9TpT/eDZV8q0xQBUa', '2026-02-01 05:03:08'),
('cd623172-a5ed-41bf-a67b-05bc663a8b06', 'Amir Ayaan', 'Latorre', 'amir ayaan.latorre', 'student', 'amir ayaan.latorre@wmsu.edu.ph', '$2a$12$qhAZBbhcdh/Yj2h5FBIIq.hDmeRi56vPY..OcS6OjUqJ9Pw4X0qe6', '2026-02-01 05:03:05'),
('cd8485f3-2dae-4831-b517-8b4763b9b696', 'Daenerys Ysabelle', 'Orque', 'daenerys ysabelle.orque', 'student', 'daenerys ysabelle.orque@wmsu.edu.ph', '$2a$12$VfWbvyHNAKzxEIOaUiWRi.w7pxATe9uC/g9iiDJ8rAZ66Q9tXwWqq', '2026-02-01 05:02:33'),
('cf5304d6-a9de-428f-ade4-f6d2b678221f', 'Mariace Carrie', 'Luna', 'mariace carrie.luna', 'student', 'mariace carrie.luna@wmsu.edu.ph', '$2a$12$F8GWeaMK5NoUw2AfQPkoGeU/YpxZbYmNOViqdu7FFYXFqT5q3dKAe', '2026-02-01 05:02:11'),
('cfe2805c-3163-4cbb-bcfc-3cb87715e80e', 'Zherhana Jamila', 'Edding', 'zherhana jamila.edding', 'student', 'zherhana jamila.edding@wmsu.edu.ph', '$2a$12$YzYcBSXhAQLwkYo.3L6QneG.BmDli8guPOL2AKOvkfHI58b3sbnSu', '2026-02-01 05:02:29'),
('d2e731df-5a18-444d-89b4-4ec882dac6ca', 'Zheeshan Alraies', 'Abdulhamid', 'zheeshan alraies.abdulhamid', 'student', 'zheeshan alraies.abdulhamid@wmsu.edu.ph', '$2a$12$O/ckBt/5V2PCoGdwQXNiAePNlKIIn9FplUjyxdsF/GJry2UdIJFRu', '2026-02-01 05:03:01'),
('d631c8f6-b599-48fc-ac5a-fb00aac98034', 'Abdelkaizer', 'Sarjaan', 'abdelkaizer.sarjaan', 'student', 'abdelkaizer.sarjaan@wmsu.edu.ph', '$2a$12$X5b.pVO562TfhuRMJ1334uk59IveBmZlspRJvesw9efp4R/QLib4y', '2026-02-01 05:02:24'),
('d6a79059-0bdf-4348-ad84-c272ea7dc0ee', 'Ahriena', 'Khalifa', 'ahriena.khalifa', 'student', 'ahriena.khalifa@wmsu.edu.ph', '$2a$12$ePvbOAQBGgHOEPTmqitN4.KHyBz0to/gnzvk.009NYymGLshQ89nm', '2026-02-01 05:02:10'),
('d6bdfef9-b1ef-4f81-9d6e-db7d235ab40b', 'Myiesha Liyana', 'Abdulhamid', 'myiesha liyana.abdulhamid', 'student', 'myiesha liyana.abdulhamid@wmsu.edu.ph', '$2a$12$pTGX5kzjHwRdTzydQiOqFeWfhC7VT2DjBr4TJavxrQ5A8Kpvav5lq', '2026-02-01 05:02:26'),
('d7d7f878-ea9c-47ed-802d-6d286e6b8916', 'Ghazanfar', 'Gonzalez', 'ghazanfar.gonzalez', 'student', 'ghazanfar.gonzalez@wmsu.edu.ph', '$2a$12$vmjEE6KRgIgAagkeQiWnTOnhAsPQqWXCG5hCjvmPkhrKhRebncxdO', '2026-02-01 05:02:19'),
('d8312e1c-996e-4bfc-840d-65a2dd2f11cc', 'Pio Marcus Angelo', 'Padawan', 'pio marcus angelo.padawan', 'student', 'pio marcus angelo.padawan@wmsu.edu.ph', '$2a$12$IduI1dEAdBr6M5NWX9CK3.ljTCKLeQkOUbpMMrD9HtMQ7rwzgEbz6', '2026-02-01 05:03:06'),
('d8de2ac8-8763-4921-a84c-defa6dca37c4', 'Jilliane', 'Pioquinto', 'jilliane.pioquinto', 'student', 'jilliane.pioquinto@wmsu.edu.ph', '$2a$12$AfH5XiYMiyOb1Y4tlGHtMeOjDZE8l83UNBeqdJzjHCSComdKcUeJO', '2026-02-01 05:02:58'),
('d983d89d-c1ec-42c8-a909-6393c9cea40b', 'Princess Jacelza', 'Kiram', 'princess jacelza.kiram', 'student', 'princess jacelza.kiram@wmsu.edu.ph', '$2a$12$V1F4WA60NZ4D5tG7D5VVi.IXgeO5WMS4S/N8uxooV2amQf/1.obB2', '2026-02-01 05:03:14'),
('d9a7735e-0d3a-4df7-ad11-091ae18a0c1c', 'Zayd Hisham', 'Tandah', 'zayd hisham.tandah', 'student', 'zayd hisham.tandah@wmsu.edu.ph', '$2a$12$zWQPDH37D0wzWXSE8v62VeA9vwos.0TiGNLML1oX4TMhLfjw/BupC', '2026-02-01 05:03:08'),
('dd29f846-e28c-42d2-af8b-0d7200463569', 'Landimer', 'Halipa', 'landimer.halipa', 'student', 'landimer.halipa@wmsu.edu.ph', '$2a$12$5EsvwUu/XlH6yJhOB2HEGuFR2tY49bKAHsQBVxb5MNDx1EGfz60r6', '2026-02-01 05:02:20'),
('ddb9a9f5-2e92-47b0-b971-4204c34afd7f', 'Karline Saoirse', 'Hernandez', 'karline saoirse.hernandez', 'student', 'karline saoirse.hernandez@wmsu.edu.ph', '$2a$12$M8IeTY4fBqQMBBAheZeNiuF22LUqFLSp3htcyVPzcgJPmxd3q7vQq', '2026-02-01 05:03:13'),
('ddf19c19-4f69-4b92-921c-f3bc9293f14b', 'Franxine Ann', 'Francisco', 'franxine ann.francisco', 'student', 'franxine ann.francisco@wmsu.edu.ph', '$2a$12$wQ.6YbgfUwtVAVkrYb7YE.RMU61DYYiAOAQVcW.Nmbu0JT0VaIFFy', '2026-02-01 05:02:07'),
('df1dc622-2d07-4575-80a5-4cc68d494b41', 'Ziyadh', 'Gadjali', 'ziyadh.gadjali', 'student', 'ziyadh.gadjali@wmsu.edu.ph', '$2a$12$5iSTF86t239zsxYs9rtzkeszsJd..L96hlt9pH1G/rsVJrI.9eF4W', '2026-02-01 05:01:59'),
('e162e350-35bf-4f67-abc5-28bd73b9ad42', 'Emmanuel John', 'Limen', 'emmanuel john.limen', 'student', 'emmanuel john.limen@wmsu.edu.ph', '$2a$12$C1GxwjdlINuzTVZrRm5Xj.dMVQ0NUJylc8n7fZyznf7V6sqw6Ayau', '2026-02-01 05:02:45'),
('e24fbcc2-69ea-40c4-af15-3332ef7d5909', 'Atheyah', 'Mustafa', 'atheyah.mustafa', 'student', 'atheyah.mustafa@wmsu.edu.ph', '$2a$12$hkM2gDfYxMWGA9eV0f2WY.5DNlesYPUnNbPP0SLbe9jGy0kNkUcO.', '2026-02-01 05:03:16'),
('e279a93d-49c4-4b00-a8a4-33b3f0d15d3b', 'Mariam', 'Jamani', 'mariam.jamani', 'student', 'mariam.jamani@wmsu.edu.ph', '$2a$12$IKyMNGMpa2QwarrL6spRO.q2PHdbCO6QXvXcNgVMTbtc0HO3DnzHq', '2026-02-01 05:02:55'),
('e68d593f-4bee-4c7e-a3f8-d245f2029246', 'Khalid Saif', 'Alamia', 'khalid saif.alamia', 'student', 'khalid saif.alamia@wmsu.edu.ph', '$2a$12$JVEQvlyn28Tur8wDdoqa8OrcaZiD97ag1gVmRpKnjp35JkRMmqdS.', '2026-02-01 05:03:02'),
('e6b5b84a-700b-4f13-b862-e49ac1565df4', 'Ziara', 'Tingkasan', 'ziara.tingkasan', 'student', 'ziara.tingkasan@wmsu.edu.ph', '$2a$12$PltobSRXS.mVGXOcrLEqeuoXbNazNmpmfnPXECs/LRcPTXeCo.Lv2', '2026-02-01 05:02:16'),
('e82cee7e-ef96-4726-bdc1-869a9202ffab', 'Roby Sean', 'Escosio', 'roby sean.escosio', 'student', 'roby sean.escosio@wmsu.edu.ph', '$2a$12$2LRwm4PsJMyrAN6rYjkZBezdH2tmwsTHGj0bLEDjtftZljniIRAQu', '2026-02-01 05:02:42'),
('eb486511-8ef3-47a7-b47a-3928f4d3b839', 'Natalia Vernice', 'Grajo', 'natalia vernice.grajo', 'student', 'natalia vernice.grajo@wmsu.edu.ph', '$2a$12$l6haFdXvW4WNgbxj7PV84.WeY/RpiLjQmOMhWxG759exr8CLJF8ou', '2026-02-01 05:02:08'),
('eb579051-ce96-4d58-9dbf-a4e56acec697', 'Nicholas Christiansen', 'Ramos', 'nicholas christiansen.ramos', 'student', 'nicholas christiansen.ramos@wmsu.edu.ph', '$2a$12$Q1Iui32amBOhGlmGNs7/X.d0L8ThVv.5jwNoK/HYXd0BbmUb/iwMS', '2026-02-01 05:02:46'),
('ebc42ca9-9487-46e8-8bd0-1e75399f3a31', 'Stephen Earl', 'Santos', 'stephen earl.santos', 'student', 'stephen earl.santos@wmsu.edu.ph', '$2a$12$1XrMVw0Gk2UaMps8fXu6d.Xvz7spJuUkO24yfqcJwCKvXT6Tx7mWa', '2026-02-01 05:02:47'),
('ee3d4282-b3ef-4ba5-a370-89d9bd6ae4d1', 'Fatima Aleena', 'Ajihil', 'fatima aleena.ajihil', 'student', 'fatima aleena.ajihil@wmsu.edu.ph', '$2a$12$mbmjTwcMVdNy8O1eJNnrb.6aM8plfxE9BfSevV31/xgLm6uNtAR1S', '2026-02-01 05:02:49'),
('ef73c75d-7344-44f9-ba5a-26cc30cc59be', 'Zahir Rizqeen', 'Aranan', 'zahir rizqeen.aranan', 'student', 'zahir rizqeen.aranan@wmsu.edu.ph', '$2a$12$K5sDrxLc/YLwFS9F0YyXreYSAGqfGyyEK8OkZCvoZqo9Gk1Jl4Rp.', '2026-02-01 05:02:39'),
('f18ba3ce-abf7-468b-bcb3-ae81cdeebaa1', 'Asfiya', 'Sacay', 'asfiya.sacay', 'student', 'asfiya.sacay@wmsu.edu.ph', '$2a$12$CjYqExEBkF1vcvjl3tGFrewVQmi8yWhb2LwOgwkjgipJaq75ARFxy', '2026-02-01 05:03:18'),
('f44371d3-99be-45c0-b0ec-75445305c095', 'Ryan Reaven', 'Jaafar', 'ryan reaven.jaafar', 'student', 'ryan reaven.jaafar@wmsu.edu.ph', '$2a$12$Xc1IRLFWd3/4D7Br1HvsGODB297V1gEIL4epJuAyITC68APgnsMUO', '2026-02-01 05:02:43'),
('f52ca641-6629-4f74-af1f-c34b067ea61e', 'Aleeyah', 'Buroy', 'aleeyah.buroy', 'student', 'aleeyah.buroy@wmsu.edu.ph', '$2a$12$frD.DzJV7cT.FhR25yA9/eBJAkGXyioRdoeOO0t0ztZjRiDPPCPaC', '2026-02-01 05:02:04'),
('f635b936-4d1b-4dc4-aa01-cf242ac934a4', 'Yu One', 'Vivar', 'yu one.vivar', 'student', 'yu one.vivar@wmsu.edu.ph', '$2a$12$opx9clvxwdY/qsua40q7u.uiVYFn84DwHkb8okL/edSPfYSLg74.q', '2026-02-01 05:03:09'),
('f6f90d11-14b3-4750-accb-ab52143a333a', 'Arteon Fourth', 'De Guzman', 'arteon fourth.de guzman', 'student', 'arteon fourth.de guzman@wmsu.edu.ph', '$2a$12$WSTvcdE5gM.jJMzJuadnzuDCjyhTcRViLaaWEaFaH5C79PFbZR/5K', '2026-02-01 05:02:41'),
('f74aa20f-027f-4cc4-a3a5-bbb926bc9c6a', 'Jax Zeldrich', 'Baquial', 'jax zeldrich.baquial', 'student', 'jax zeldrich.baquial@wmsu.edu.ph', '$2a$12$9ckCW8dtqvE48MV7WyYQFeLq2XDfVRnyuifMrmsVWfGKXX2dWYMgW', '2026-02-01 05:02:39'),
('f88ee984-ce53-4c17-a4e9-063514281894', 'Elishia', 'Macaso', 'elishia.macaso', 'student', 'elishia.macaso@wmsu.edu.ph', '$2a$12$VU4D5tZoH0sR2V0Dd0HUXuZ003bOptnciI1LmrAbiCkPSqQpI97Qi', '2026-02-01 05:02:57'),
('f8adb148-eacb-406a-836d-96b6393509cc', 'Zara', 'Ali', 'zara.ali', 'student', 'zara.ali@wmsu.edu.ph', '$2a$12$LRRlxwaByybGS3rtxGY4Ven/TDah4wR11ro/FrPl5MysDI7nu72g6', '2026-02-01 05:02:49'),
('f95aa3ef-3a88-46f2-b739-ab58b8e92f85', 'Jhihann', 'Hairon', 'jhihann.hairon', 'student', 'jhihann.hairon@wmsu.edu.ph', '$2a$12$uthSS44faplN.KOV0i66BOEiYPWlTTB25Zjddp3q.QKQ0gWWMZ9Zq', '2026-02-01 05:02:30'),
('f97a3102-75c1-46eb-b69c-977d46f51392', 'Cyle Asher', 'Caspillo', 'cyle asher.caspillo', 'student', 'cyle asher.caspillo@wmsu.edu.ph', '$2a$12$s82DG/lVluM9pUoH3I3O2e6D0AehCzmZUE2FP5nQm47HyibTdxdeG', '2026-02-01 05:02:40'),
('fafd1cb1-0cd4-4427-8f21-042fd48b3962', 'Mishary', 'Bakial', 'mishary.bakial', 'student', 'mishary.bakial@wmsu.edu.ph', '$2a$12$M3Fn/gA5EJnsE6iYJ8SpLeAgsJw2Mc9Ad2zY41IWVaAxlgTT.zua6', '2026-02-01 05:02:18'),
('fb0c0e60-e0f8-41d4-9e6d-776edf8c4ac6', 'Chloe Gyle', 'Lastimoso', 'chloe gyle.lastimoso', 'student', 'chloe gyle.lastimoso@wmsu.edu.ph', '$2a$12$4JvdRjpdihBaYYUjLxFkUOFBZuqgizgV4x/jz9QOp1zzE7dA.lara', '2026-02-01 05:03:15'),
('fdf76daa-ed73-4621-b567-2d874ba77a3d', 'Aika Grace', 'Flores', 'aika grace.flores', 'student', 'aika grace.flores@wmsu.edu.ph', '$2a$12$DkhoP3gKeJns5nZIK6xH4OMGsz9oqJ15OKdqgAZOAyQDnl/OrQDca', '2026-02-01 05:02:07');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
