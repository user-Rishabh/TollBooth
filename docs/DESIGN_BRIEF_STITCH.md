# RailBook Design Brief & Stitch Tokens

This document details the visual identity, design tokens, and interface architecture for **RailBook**, the IRCTC Tatkal booking clone used as the target environment for Tollbooth bot defense experiments.

---

## 1. Brand Tokens & Color System

| Token | Hex Value | Role | Usage |
|---|---|---|---|
| **Primary Navy** | `#003A70` | Brand anchor | Main header, primary action buttons, section headlines |
| **Secondary Orange** | `#D97706` | Tatkal accent | Countdown badge, verify button, highlight banners |
| **Tertiary Cream** | `#FFF8E1` | Background canvas | Page background, card hover states |
| **Dark Neutral** | `#212529` | Text / Form elements | High-contrast body text, form labels, input values |
| **Light Card Fill** | `#FFFFFF` | Form surfaces | Card containers, input field backgrounds |
| **Muted Slate** | `#64748B` | Secondary text | Helper notes, timestamps, input placeholders |

### Typography
- **Primary Font Family:** `Public Sans`, sans-serif
- **Weights:** Regular (400), Medium (500), Semi-bold (600), Bold (700)
- **Monospace Font:** `Fira Code`, monospace (used for OTP boxes, session tokens, and telemetry timestamps)

---

## 2. Screen Specifications

### 2.1 Screen 1: Register Page (`RegisterPage.tsx`)
- **Inputs:**
  - IRCTC / RailBook Username
  - Password
  - Aadhaar-Linked Mobile (10 digits) with "Mock Simulation" badge
- **Actions:**
  - Complete Registration -> redirects to Login

### 2.2 Screen 2: Login Page (`LoginPage.tsx`)
- **Inputs:**
  - Username / User ID
  - Password
- **Demo Enhancements:**
  - Quick-click autofill badges for test accounts (`tatkal_runner_1`, `tatkal_runner_2`, `tatkal_runner_3`)
- **Banner:**
  - Informs the user that a mock Aadhaar OTP is required before booking

### 2.3 Screen 3: OTP Verification Page (`OtpVerificationPage.tsx`)
- **6-Digit Boxed Inputs:**
  - Individual styled boxes with auto-focus advance, backspace regression, and full-string paste support
- **Identity Indicators:**
  - Displays masked mobile number (`XXXXXX3210`)
  - 60-second countdown with Resend button
- **Demo Convenience:**
  - Prominent badge showing the generated mock OTP with a 1-click "Autofill Code" button
- **Client Telemetry:**
  - Captures `inter_keystroke_intervals_ms` and `page_load_to_first_action_ms` for continuous behavioral scoring

### 2.4 Screen 4: Train Availability & Tatkal List (Phase 3)
- Live countdown to 10:00 AM Tatkal open window
- Train cards with available Tatkal seat counter and "Book Now" CTA

### 2.5 Screen 5: Passenger Booking & CAPTCHA (Phase 4)
- Passenger details table
- Case-sensitive CAPTCHA with timer
- Telemetry payload compilation

### 2.6 Screen 6: Booking Confirmation & Telemetry (Phase 5)
- Confirmed state: PNR and seat assignment
- Challenged / Blocked state: Tollbooth security telemetry breakdown panel

---

## 3. Mandatory Disclaimers
Every page must include the following statements in the global layout footer:
1. *"Not affiliated with IRCTC or Indian Railways"*
2. *"Clone Demo Environment for Tollbooth Security Defense testing"*
3. Note explaining that mock Aadhaar authentication involves no real UIDAI or government APIs.

---

## 4. Visual-Only Nav Realism
The sub-navigation bar includes tabs for visual authenticity:
- **Book Ticket** (Functional)
- **Tatkal Special** (Visual only)
- **PNR Status** (Visual only)
- **Train Schedule** (Visual only)
- **Cancel Ticket** (Visual only)
