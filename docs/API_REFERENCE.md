# API Reference Specification

This document details the REST API contracts for the **RailBook** clone backend and the **Tollbooth** defense layer.

---

## 1. Authentication & Mock Identity Layer

### 1.1 Register User
Registers a new user account linked to a mock Aadhaar mobile number.

- **Method:** `POST`
- **Endpoint:** `/api/register`
- **Request Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "username": "traveler_rajesh",
    "password": "Password123!",
    "aadhaar_linked_mobile": "9876543210"
  }
  ```
- **Responses:**
  - `201 Created`:
    ```json
    {
      "user_id": "7b7e28b1-360e-436f-b258-00977ba2204c",
      "username": "traveler_rajesh",
      "aadhaar_linked_mobile": "9876543210",
      "message": "User registered successfully"
    }
    ```
  - `400 Bad Request`: Username already taken or invalid input format.

---

### 1.2 User Login (Password Verification & OTP Generation)
Verifies user credentials and generates a 6-digit mock Aadhaar OTP for the linked mobile. Test accounts defined in `bots/config/accounts.json` receive a deterministic known OTP (`123456`).

- **Method:** `POST`
- **Endpoint:** `/api/login`
- **Request Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "username": "tatkal_runner_1",
    "password": "Password123!"
  }
  ```
- **Responses:**
  - `200 OK`:
    ```json
    {
      "user_id": "7b7e28b1-360e-436f-b258-00977ba2204c",
      "username": "tatkal_runner_1",
      "aadhaar_linked_mobile": "9876543210",
      "masked_mobile": "XXXXXX3210",
      "otp_code": "123456",
      "otp_expires_at": "2026-09-06T15:45:00.000Z",
      "message": "Mock OTP generated and sent to Aadhaar-linked mobile"
    }
    ```
  - `401 Unauthorized`: Invalid username or password.

---

### 1.3 Send / Resend OTP
Regenerates an active mock OTP for an existing session/user.

- **Method:** `POST`
- **Endpoint:** `/api/send-otp`
- **Request Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "user_id": "7b7e28b1-360e-436f-b258-00977ba2204c"
  }
  ```
- **Responses:**
  - `200 OK`:
    ```json
    {
      "user_id": "7b7e28b1-360e-436f-b258-00977ba2204c",
      "otp_code": "123456",
      "otp_expires_at": "2026-09-06T15:50:00.000Z",
      "message": "Mock OTP generated successfully"
    }
    ```
  - `404 Not Found`: User does not exist.

---

### 1.4 Verify OTP
Validates the 6-digit mock OTP against the active record for the user. Accepts optional `client_timing_metadata` used by Tollbooth defense scoring.

- **Method:** `POST`
- **Endpoint:** `/api/verify-otp`
- **Request Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "user_id": "7b7e28b1-360e-436f-b258-00977ba2204c",
    "otp_code": "123456",
    "client_timing_metadata": {
      "inter_keystroke_intervals_ms": [120, 110, 135, 95, 102],
      "page_load_to_first_action_ms": 1450,
      "total_interaction_time_ms": 2850
    }
  }
  ```
- **Responses:**
  - `200 OK`:
    ```json
    {
      "session_token": "rb_session_8fbc23e0a17f4dcab98d89e496a75f10",
      "user_id": "7b7e28b1-360e-436f-b258-00977ba2204c",
      "username": "tatkal_runner_1",
      "message": "OTP verified successfully"
    }
    ```
  - `400 Bad Request`: OTP mismatch, expired OTP, or missing OTP request.
  - `429 Too Many Requests`: Exceeded maximum attempts (5 failed tries).

---

## 2. Train Search & Inventory (Phase 3)
*(To be detailed in Phase 3)*

- `GET /api/trains`

---

## 3. Booking & Telemetry Verification (Phase 4)
*(To be detailed in Phase 4)*

- `POST /api/book`
