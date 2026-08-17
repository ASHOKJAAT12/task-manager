export const UserRolesEnum = {
    ADMIN: "admin",
    PROJECT_ADMIN: "project_admin",
    MEMBER: "member",
};

// Backward-compat alias (was misspelled in original code)
export const UserRolseEnum = UserRolesEnum;

export const AvailableUserRole = Object.values(UserRolesEnum);

export const TaskStatusEnum = {
    TODO: "todo",
    IN_PROGRESS: "in_progress",
    DONE: "done",
};

export const AvailableTaskStatuses = Object.values(TaskStatusEnum);

// Backward-compat alias (was misspelled in original code)
export const AvailableTaskStatues = AvailableTaskStatuses;