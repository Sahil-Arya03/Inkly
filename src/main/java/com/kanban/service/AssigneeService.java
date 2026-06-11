package com.kanban.service;

import com.kanban.domain.Membership;
import com.kanban.repository.KanbanUserRepository;
import com.kanban.repository.MembershipRepository;
import com.kanban.web.dto.AssigneeDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AssigneeService {

    private final KanbanUserRepository kanbanUsers;
    private final MembershipRepository memberships;

    /**
     * Returns kanban users who share the caller's workspace and department.
     * Falls back to all workspace members when the caller has no department set.
     */
    @Transactional(readOnly = true)
    public List<AssigneeDto> fetchAssignees(String callerEmail) {
        UUID callerId = kanbanUsers.findByEmail(callerEmail)
            .orElseThrow(() -> new IllegalArgumentException("Kanban user not found for: " + callerEmail))
            .getId();

        List<Membership> callerMemberships = memberships.findByUserId(callerId);
        if (callerMemberships.isEmpty()) return List.of();

        Membership callerMembership = callerMemberships.get(0);
        UUID workspaceId = callerMembership.getWorkspace().getId();
        UUID deptId = callerMembership.getDepartment() != null
            ? callerMembership.getDepartment().getId()
            : null;

        List<Membership> members = deptId != null
            ? memberships.findByWorkspaceIdAndDepartmentId(workspaceId, deptId)
            : memberships.findByWorkspaceId(workspaceId);

        return members.stream()
            .map(m -> new AssigneeDto(m.getUser().getId(), m.getUser().getName(), m.getUser().getEmail()))
            .sorted(Comparator.comparing(AssigneeDto::name))
            .toList();
    }
}
