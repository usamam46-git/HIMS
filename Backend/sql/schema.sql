-- =====================================================
-- HIMS OPD Module Database Schema
-- Database: hims
-- =====================================================
-- Run this script in phpMyAdmin SQL tab or MySQL command line
-- Make sure you have selected the 'hims' database first
-- =====================================================

-- Use the hims database
USE hims;

-- =====================================================
-- TABLE 1: shifts (Active Shift Tracking)
-- Each shift gets a unique auto-incremented ID
-- Only 3 shifts allowed per day (enforced by application)
-- Starts from 5000 for legacy compatibility
-- =====================================================

CREATE TABLE IF NOT EXISTS shifts (
    shift_id INT AUTO_INCREMENT PRIMARY KEY,
    shift_date DATE NOT NULL COMMENT 'Date when shift started',
    shift_type ENUM('Morning', 'Evening', 'Night') NOT NULL,
    shift_start_time DATETIME NOT NULL COMMENT 'Actual shift start timestamp',
    shift_end_time DATETIME DEFAULT NULL COMMENT 'Actual shift end timestamp (NULL if ongoing)',
    opened_by VARCHAR(100) NOT NULL COMMENT 'User who opened the shift',
    closed_by VARCHAR(100) DEFAULT NULL COMMENT 'User who closed the shift',
    is_closed BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Ensure only one shift of each type per date
    UNIQUE KEY unique_shift_per_day (shift_date, shift_type),
    
    -- Index for common queries
    INDEX idx_shift_date (shift_date),
    INDEX idx_is_closed (is_closed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE 0: mr_data (Patient Master Data)
-- Stores permanent patient records
-- =====================================================

DROP TABLE IF EXISTS mr_data;

CREATE TABLE mr_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mr_number VARCHAR(20) NOT NULL UNIQUE COMMENT 'Unique MR Number like MR-2026-00001',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) DEFAULT NULL,
    guardian_name VARCHAR(100) DEFAULT NULL,
    guardian_relation VARCHAR(50) DEFAULT 'Parent',
    cnic VARCHAR(20) DEFAULT NULL,
    dob DATE DEFAULT NULL,
    age INT DEFAULT NULL,
    gender ENUM('Male', 'Female', 'Other') NOT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    email VARCHAR(100) DEFAULT NULL,
    profession VARCHAR(100) DEFAULT NULL,
    address TEXT DEFAULT NULL,
    city VARCHAR(50) DEFAULT NULL,
    blood_group VARCHAR(5) DEFAULT NULL,
    status BOOLEAN DEFAULT TRUE COMMENT '1=Active, 0=Inactive',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_mr_number (mr_number),
    INDEX idx_phone (phone),
    INDEX idx_cnic (cnic),
    INDEX idx_name (first_name, last_name)
) ENGINE=InnoDB AUTO_INCREMENT=100000 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- TABLE 1: shifts (Active Shift Tracking)

-- =====================================================
-- TABLE 2: opd_services (Setup/Master Table)
-- Service types available for OPD
-- =====================================================

CREATE TABLE IF NOT EXISTS opd_services (
    srl_no INT AUTO_INCREMENT PRIMARY KEY,
    service_id VARCHAR(20) NOT NULL UNIQUE COMMENT 'Service code like SRV001',
    service_name VARCHAR(100) NOT NULL,
    service_head VARCHAR(100) NOT NULL COMMENT 'Service category/department',
    service_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    required_consultant BOOLEAN DEFAULT FALSE COMMENT 'If doctor consultation is required',
    price_editable BOOLEAN DEFAULT FALSE COMMENT 'If rate can be modified at receipt',
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_service_head (service_head),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE 2.5: doctors (Consultant/Doctor Master Table)
-- Stores registered doctors/consultants
-- =====================================================

CREATE TABLE IF NOT EXISTS doctors (
    srl_no INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id VARCHAR(20) NOT NULL UNIQUE COMMENT 'Doctor code like DOC001',
    doctor_name VARCHAR(100) NOT NULL,
    doctor_specialization VARCHAR(100) DEFAULT NULL,
    doctor_department VARCHAR(100) DEFAULT NULL,
    doctor_qualification VARCHAR(200) DEFAULT NULL,
    doctor_phone VARCHAR(20) DEFAULT NULL,
    doctor_email VARCHAR(100) DEFAULT NULL,
    doctor_address TEXT DEFAULT NULL,
    doctor_share DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Default share percentage',
    consultation_fee DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_doctor_name (doctor_name),
    INDEX idx_doctor_department (doctor_department),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE 3: consultant_payments
-- Tracks payments made to doctors for their share
-- =====================================================

CREATE TABLE IF NOT EXISTS consultant_payments (
    srl_no INT AUTO_INCREMENT PRIMARY KEY,
    payment_id VARCHAR(20) NOT NULL UNIQUE COMMENT 'Voucher ID like PAY001',
    payment_date DATE NOT NULL,
    payment_time TIME NOT NULL,
    doctor_name VARCHAR(100) NOT NULL,
    payment_department VARCHAR(100) DEFAULT NULL,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Total service amount',
    payment_share DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Doctor share percentage',
    payment_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Actual amount paid',
    patient_id VARCHAR(50) DEFAULT NULL COMMENT 'Patient MR number',
    patient_date DATE DEFAULT NULL COMMENT 'Service date',
    patient_service VARCHAR(100) DEFAULT NULL COMMENT 'Service provided',
    patient_name VARCHAR(100) DEFAULT NULL,
    shift_closed BOOLEAN DEFAULT FALSE,
    shift_id INT DEFAULT NULL COMMENT 'References shifts.shift_id',
    shift_type ENUM('Morning', 'Evening', 'Night') DEFAULT NULL,
    shift_date DATE DEFAULT NULL COMMENT 'Logical shift date',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_payment_date (payment_date),
    INDEX idx_doctor_name (doctor_name),
    INDEX idx_shift_id (shift_id),
    INDEX idx_shift_date (shift_date),
    INDEX idx_shift_closed (shift_closed)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE 4: expenses
-- Tracks all OPD expenses including doctor shares
-- =====================================================

CREATE TABLE IF NOT EXISTS expenses (
    srl_no INT AUTO_INCREMENT PRIMARY KEY,
    expense_id VARCHAR(20) NOT NULL UNIQUE COMMENT 'Expense ID like EXP001',
    expense_date DATE NOT NULL,
    expense_time TIME NOT NULL,
    expense_shift ENUM('Morning', 'Evening', 'Night') NOT NULL,
    expense_description TEXT DEFAULT NULL COMMENT 'Details, includes dr share if applicable',
    expense_name VARCHAR(100) NOT NULL COMMENT 'Expense category/name',
    expense_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    expense_by VARCHAR(100) NOT NULL COMMENT 'Who recorded the expense',
    shift_id INT DEFAULT NULL COMMENT 'References shifts.shift_id',
    shift_date DATE DEFAULT NULL COMMENT 'Logical shift date',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_expense_date (expense_date),
    INDEX idx_expense_shift (expense_shift),
    INDEX idx_shift_id (shift_id),
    INDEX idx_shift_date (shift_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE 5: opd_patient_data
-- Main OPD receipt/transaction table
-- =====================================================

CREATE TABLE IF NOT EXISTS opd_patient_data (
    srl_no INT AUTO_INCREMENT PRIMARY KEY,
    receipt_id VARCHAR(20) NOT NULL UNIQUE COMMENT 'Receipt number',
    patient_mr_number VARCHAR(50) DEFAULT NULL COMMENT 'Links to mr_data.mr_number',
    date DATE NOT NULL,
    time TIME NOT NULL,
    emergency_paid BOOLEAN DEFAULT FALSE,
    patient_token_appointment BOOLEAN DEFAULT FALSE,
    patient_checked BOOLEAN DEFAULT FALSE,
    patient_requested_discount BOOLEAN DEFAULT FALSE,
    patient_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) DEFAULT NULL,
    patient_age VARCHAR(10) DEFAULT NULL,
    patient_gender ENUM('Male', 'Female', 'Other') DEFAULT NULL,
    patient_address TEXT DEFAULT NULL,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount DECIMAL(10,2) DEFAULT 0.00,
    payable DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    paid DECIMAL(10,2) DEFAULT 0.00,
    balance DECIMAL(10,2) DEFAULT 0.00,
    service_details TEXT DEFAULT NULL COMMENT 'JSON array of services',
    service_amount DECIMAL(10,2) DEFAULT 0.00,
    opd_discount BOOLEAN DEFAULT FALSE,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    discount_reason VARCHAR(255) DEFAULT NULL,
    discount_id VARCHAR(20) DEFAULT NULL,
    dr_share DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Doctor share percentage',
    dr_share_amount DECIMAL(10,2) DEFAULT 0.00,
    hospital_share DECIMAL(10,2) DEFAULT 0.00,
    paid_to_doctor BOOLEAN DEFAULT FALSE,
    opd_cancelled BOOLEAN DEFAULT FALSE,
    cancel_details TEXT DEFAULT NULL,
    opd_refund BOOLEAN DEFAULT FALSE,
    refund_reason VARCHAR(255) DEFAULT NULL,
    refund_amount DECIMAL(10,2) DEFAULT 0.00,
    shift_closed BOOLEAN DEFAULT FALSE,
    shift_id INT DEFAULT NULL COMMENT 'References shifts.shift_id',
    shift_type ENUM('Morning', 'Evening', 'Night') DEFAULT NULL,
    shift_date DATE DEFAULT NULL COMMENT 'Logical shift date (when shift started)',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_patient_mr (patient_mr_number),
    INDEX idx_date (date),
    INDEX idx_shift_id (shift_id),
    INDEX idx_shift_date (shift_date),
    INDEX idx_shift_closed (shift_closed),
    INDEX idx_opd_cancelled (opd_cancelled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE 6: opd_shift_cash
-- Shift closing/summary records
-- =====================================================

CREATE TABLE IF NOT EXISTS opd_shift_cash (
    srl_no INT AUTO_INCREMENT PRIMARY KEY,
    shift_id INT NOT NULL COMMENT 'References shifts.shift_id',
    shift_date DATE NOT NULL,
    shift_time TIME NOT NULL COMMENT 'Shift close time',
    submit_by VARCHAR(100) NOT NULL COMMENT 'Who closed the shift',
    shift_type ENUM('Morning', 'Evening', 'Night') NOT NULL,
    receipt_from VARCHAR(20) DEFAULT NULL COMMENT 'First receipt in shift',
    receipt_to VARCHAR(20) DEFAULT NULL COMMENT 'Last receipt in shift',
    expense_from VARCHAR(20) DEFAULT NULL COMMENT 'First expense in shift',
    expense_to VARCHAR(20) DEFAULT NULL COMMENT 'Last expense in shift',
    total_amount DECIMAL(12,2) DEFAULT 0.00,
    service_serial INT DEFAULT 0,
    service_head VARCHAR(100) DEFAULT NULL,
    service_qty INT DEFAULT 0,
    service_amount DECIMAL(10,2) DEFAULT 0.00,
    service_discount_qty INT DEFAULT 0,
    service_discount_amount DECIMAL(10,2) DEFAULT 0.00,
    service_paid DECIMAL(10,2) DEFAULT 0.00,
    service_balance DECIMAL(10,2) DEFAULT 0.00,
    service_invoice_from VARCHAR(20) DEFAULT NULL,
    service_invoice_to VARCHAR(20) DEFAULT NULL,
    service_invoice_mode VARCHAR(20) DEFAULT 'OPD',
    total_quantity INT DEFAULT 0,
    total_collected DECIMAL(12,2) DEFAULT 0.00,
    total_discount_quantity INT DEFAULT 0,
    total_discount_amount DECIMAL(10,2) DEFAULT 0.00,
    total_paid DECIMAL(12,2) DEFAULT 0.00,
    total_balance DECIMAL(12,2) DEFAULT 0.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_shift_cash (shift_id),
    INDEX idx_shift_date (shift_date),
    INDEX idx_shift_type (shift_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- UPDATE mr_data TABLE (if exists)
-- Set AUTO_INCREMENT to start from 100000
-- =====================================================

-- Only run this if you need to reset mr_data auto increment
-- ALTER TABLE mr_data AUTO_INCREMENT = 100000;

-- =====================================================
-- Insert default shift types reference (optional)
-- This is just for reference, actual shifts are in shifts table
-- =====================================================

-- You can create a lookup table if needed:
-- CREATE TABLE IF NOT EXISTS shift_types (
--     type_id INT PRIMARY KEY,
--     type_name VARCHAR(20) NOT NULL,
--     default_start_time TIME,
--     default_end_time TIME
-- ) ENGINE=InnoDB;
-- 
-- INSERT INTO shift_types VALUES 
-- (1, 'Morning', '06:00:00', '14:00:00'),
-- (2, 'Evening', '14:00:00', '22:00:00'),
-- (3, 'Night', '22:00:00', '06:00:00');

-- =====================================================
-- VERIFICATION QUERIES
-- Run these after creating tables to verify
-- =====================================================

-- Check all tables were created:
-- SHOW TABLES LIKE 'shifts';
-- SHOW TABLES LIKE 'opd_services';
-- SHOW TABLES LIKE 'consultant_payments';
-- SHOW TABLES LIKE 'expenses';
-- SHOW TABLES LIKE 'opd_patient_data';
-- SHOW TABLES LIKE 'opd_shift_cash';

-- Check shifts auto_increment starts at 5000:
-- SHOW TABLE STATUS LIKE 'shifts';

-- =====================================================
-- END OF SCHEMA
-- =====================================================
