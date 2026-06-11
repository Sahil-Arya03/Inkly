package com.kanban.service;

/**
 * A requested resource does not exist or is not accessible to the caller.
 * Both cases map to the same 404 with a generic body so a prober cannot
 * distinguish "doesn't exist" from "exists in someone else's workspace".
 * The message is for server logs only and must never reach the client.
 */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String logDetail) {
        super(logDetail);
    }
}
