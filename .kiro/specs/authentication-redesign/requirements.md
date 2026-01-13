# Requirements Document

## Introduction

Redesign the authentication system to improve user experience with a streamlined signup flow, better email verification handling, and automatic cleanup of unverified accounts.

## Glossary

- **System**: The Hostel Ledger authentication system
- **User**: A person creating or accessing an account
- **Verification_Code**: 6-digit code sent via email for account verification
- **Unverified_Account**: Firebase account created but email not verified within 24 hours

## Requirements

### Requirement 1: Redesigned Signup Page Layout

**User Story:** As a user, I want a clean full-page signup form similar to the login page, so that I have a consistent and professional experience.

#### Acceptance Criteria

1. THE System SHALL display signup fields directly on the page background without a separate card container
2. THE System SHALL use the same visual style and layout as the login page
3. THE System SHALL organize fields in a logical flow for better user experience
4. THE System SHALL maintain responsive design across all device sizes

### Requirement 2: Multi-Step Signup Flow

**User Story:** As a user, I want to complete signup in logical steps, so that the process feels organized and not overwhelming.

#### Acceptance Criteria

1. WHEN a user accesses the signup page, THE System SHALL display basic information fields first
2. THE System SHALL collect name, email, and university information in the first step
3. THE System SHALL show password fields in a second step after basic information
4. THE System SHALL include password strength indicators and confirmation
5. THE System SHALL show clear progress indication between steps

### Requirement 3: Immediate Account Creation with Unverified Status

**User Story:** As a user, I want my account to be created immediately when I click "Create Account", so that I don't lose my progress if something goes wrong.

#### Acceptance Criteria

1. WHEN a user completes the signup form, THE System SHALL create a Firebase account immediately
2. THE System SHALL mark the account as email unverified initially
3. THE System SHALL send a verification code to the user's email
4. THE System SHALL redirect the user to the verification page
5. THE System SHALL store all user profile information in the database

### Requirement 4: Email Verification Process

**User Story:** As a user, I want to verify my email with a simple code, so that I can activate my account quickly.

#### Acceptance Criteria

1. WHEN a user enters a valid verification code, THE System SHALL mark their email as verified
2. THE System SHALL update the Firebase user's emailVerified status to true
3. THE System SHALL redirect verified users to the dashboard
4. WHEN a user enters an invalid code, THE System SHALL show clear error messages
5. THE System SHALL allow users to resend verification codes

### Requirement 5: Automatic Cleanup of Unverified Accounts

**User Story:** As a system administrator, I want unverified accounts to be automatically removed after 24 hours, so that the database stays clean and secure.

#### Acceptance Criteria

1. THE System SHALL track account creation timestamps
2. WHEN an account remains unverified for 24 hours, THE System SHALL automatically delete it
3. THE System SHALL remove both the Firebase Auth account and database profile
4. THE System SHALL clean up associated verification codes
5. THE System SHALL run cleanup operations daily

### Requirement 6: Improved Error Handling

**User Story:** As a user, I want clear error messages when something goes wrong, so that I know how to fix the problem.

#### Acceptance Criteria

1. WHEN Firebase Auth operations fail, THE System SHALL show user-friendly error messages
2. WHEN email verification fails, THE System SHALL provide specific guidance
3. WHEN network issues occur, THE System SHALL show appropriate retry options
4. THE System SHALL handle rate limiting gracefully with clear messaging
5. THE System SHALL provide helpful links for common issues

### Requirement 7: Enhanced Security Features

**User Story:** As a user, I want my account to be secure from the moment I create it, so that my data is protected.

#### Acceptance Criteria

1. THE System SHALL enforce strong password requirements
2. THE System SHALL prevent creation of accounts with existing emails
3. THE System SHALL limit verification code attempts to prevent brute force
4. THE System SHALL expire verification codes after 10 minutes
5. THE System SHALL log security-relevant events for monitoring

### Requirement 8: Seamless User Experience

**User Story:** As a user, I want the signup process to be smooth and intuitive, so that I can start using the app quickly.

#### Acceptance Criteria

1. THE System SHALL provide real-time validation feedback on form fields
2. THE System SHALL show loading states during all operations
3. THE System SHALL preserve user input if errors occur
4. THE System SHALL provide clear navigation between signup steps
5. THE System SHALL offer easy access to login for existing users