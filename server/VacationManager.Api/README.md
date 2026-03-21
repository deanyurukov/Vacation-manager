# Vacation Manager API

ASP.NET Core Web API backend for the **Vacation Manager** assignment with **MongoDB** as the database. The implementation follows the requirements from the uploaded specification: users, roles, teams, projects, leave requests, pagination, filtering, role-based access, and sick-note upload/download.

## Tech stack

- .NET 8 Web API
- MongoDB.Driver
- JWT Bearer authentication
- BCrypt password hashing
- Swagger / OpenAPI

## What is included

- `AuthController` for login
- `UsersController` for CEO-only user CRUD
- `RolesController` for CEO-only role CRUD and role membership listing
- `TeamsController` for list/detail + CEO CRUD + add/remove team members
- `ProjectsController` for list/detail + CEO CRUD + add/remove teams
- `LeaveRequestsController` for leave creation, editing, deletion, review, and sick-note download
- Seeded default roles: `CEO`, `TeamLead`, `Developer`, `Unassigned`
- Seeded default CEO account from `appsettings.json`

## Default seeded account

- Username: `ceo`
- Password: `ChangeMe123!`

Change these values immediately in `appsettings.json` or environment variables.

## Run

1. Make sure MongoDB is running locally at `mongodb://localhost:27017`.
2. Restore packages:
   ```bash
   dotnet restore
   ```
3. Start the API:
   ```bash
   dotnet run
   ```
4. Open Swagger at `/swagger`.

## Main endpoints

### Auth
- `POST /api/auth/login`

### Users (CEO only)
- `GET /api/users?page=1&pageSize=10&search=&role=`
- `GET /api/users/{id}`
- `POST /api/users`
- `PUT /api/users/{id}`
- `DELETE /api/users/{id}`

### Roles (CEO only)
- `GET /api/roles?page=1&pageSize=10&search=`
- `GET /api/roles/{id}`
- `GET /api/roles/{id}/users?page=1&pageSize=10`
- `POST /api/roles`
- `PUT /api/roles/{id}`
- `DELETE /api/roles/{id}`

### Teams
- `GET /api/teams?page=1&pageSize=10&search=&projectName=`
- `GET /api/teams/{id}`
- `POST /api/teams` (CEO)
- `PUT /api/teams/{id}` (CEO)
- `DELETE /api/teams/{id}` (CEO)
- `POST /api/teams/{id}/members` (CEO)
- `DELETE /api/teams/{id}/members/{userId}` (CEO)

### Projects
- `GET /api/projects?page=1&pageSize=10&search=`
- `GET /api/projects/{id}`
- `POST /api/projects` (CEO)
- `PUT /api/projects/{id}` (CEO)
- `DELETE /api/projects/{id}` (CEO)
- `POST /api/projects/{id}/teams` (CEO)
- `DELETE /api/projects/{id}/teams/{teamId}` (CEO)

### Leave Requests
- `GET /api/leaveRequests?page=1&pageSize=10&createdAfterUtc=&mineOnly=true`
- `GET /api/leaveRequests/{id}`
- `POST /api/leaveRequests` (`multipart/form-data` for sick leave)
- `PUT /api/leaveRequests/{id}`
- `DELETE /api/leaveRequests/{id}`
- `POST /api/leaveRequests/{id}/review` (CEO, TeamLead)
- `GET /api/leaveRequests/{id}/sick-note`

## Notes

- Pagination defaults to 10 records and can be changed per request.
- Users, teams, projects, and leave requests support filtering aligned with the assignment.
- Sick leave requires a file and disables half-day mode, matching the specification.
- Approval is limited to CEO or the Team Lead of the requester's team, matching the specification intent.
- Uploaded sick-note files are stored in `Uploads/sick-notes`. If you prefer, this can be switched later to MongoDB GridFS.
