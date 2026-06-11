package com.security;

import com.kanban.domain.KanbanUser;
import com.kanban.repository.KanbanUserRepository;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsServiceImpl userDetailsService;
    private final KanbanUserRepository kanbanUserRepository;

    public JwtAuthFilter(JwtUtil jwtUtil, UserDetailsServiceImpl userDetailsService,
                         KanbanUserRepository kanbanUserRepository) {
        this.jwtUtil = jwtUtil;
        this.userDetailsService = userDetailsService;
        this.kanbanUserRepository = kanbanUserRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res,
                                    FilterChain chain) throws ServletException, IOException {
        String token = extractToken(req);

        if (token != null && jwtUtil.isValid(token)) {
            String email = jwtUtil.extractEmail(token);
            if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails user = userDetailsService.loadUserByUsername(email);
                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(req));
                SecurityContextHolder.getContext().setAuthentication(auth);

                // Resolve the kanban-domain user so calendar endpoints can read
                // request.getAttribute("kanbanUser") without re-querying APP_USERS.
                KanbanUser kanbanUser = kanbanUserRepository.findByEmail(email).orElse(null);
                req.setAttribute("kanbanUser", kanbanUser);
            }
        }

        chain.doFilter(req, res);
    }

    private String extractToken(HttpServletRequest req) {
        Cookie[] cookies = req.getCookies();
        if (cookies != null) {
            for (Cookie c : cookies) {
                if ("inkly_token".equals(c.getName())) return c.getValue();
            }
        }
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) return header.substring(7);
        return null;
    }
}