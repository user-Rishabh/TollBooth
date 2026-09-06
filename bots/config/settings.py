import os
from dotenv import load_dotenv

load_dotenv()

TARGET_URL = os.getenv("TARGET_URL", "http://localhost:3000")
TEST_USERNAME = os.getenv("TEST_USERNAME", "test_user_1")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "Secret123!")
TEST_OTP = os.getenv("TEST_OTP", "123456")
