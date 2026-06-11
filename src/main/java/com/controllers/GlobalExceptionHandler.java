package com.controllers;

import com.dto.ErrorResponse;
import com.kanban.service.CardService;
import com.kanban.service.ResourceNotFoundException;
import com.security.LoginRateLimiter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .findFirst()
                .orElse("Validation failed");
        return ResponseEntity.badRequest().body(new ErrorResponse("VALIDATION_ERROR", message));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("NOT_FOUND", "Resource not found"));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorResponse> handleResponseStatus(ResponseStatusException ex) {
        HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
        String errorCode = status != null ? status.name() : String.valueOf(ex.getStatusCode().value());
        return ResponseEntity.status(ex.getStatusCode())
                .body(new ErrorResponse(errorCode, ex.getReason()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleBadBody(HttpMessageNotReadableException ex) {
        // Parser details (class names, offsets, raw input) stay in the log.
        log.warn("Request body parse error: {}", ex.getMostSpecificCause().getMessage());
        return ResponseEntity.badRequest()
                .body(new ErrorResponse("BAD_REQUEST", "Malformed request body"));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        log.warn("Parameter type mismatch for '{}'", ex.getName());
        return ResponseEntity.badRequest()
                .body(new ErrorResponse("BAD_REQUEST", "Invalid request parameter"));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(ResourceNotFoundException ex) {
        // Detail (ids, emails, whose workspace) is log-only by contract.
        log.warn("Resource not found or not accessible: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("NOT_FOUND", "Resource not found"));
    }

    @ExceptionHandler(LoginRateLimiter.RateLimitExceededException.class)
    public ResponseEntity<ErrorResponse> handleRateLimit(LoginRateLimiter.RateLimitExceededException ex) {
        // Deliberately generic: must not reveal whether the account exists.
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header("Retry-After", String.valueOf(ex.getRetryAfterSeconds()))
                .body(new ErrorResponse("TOO_MANY_REQUESTS", "Too many attempts. Please try again later."));
    }

    @ExceptionHandler(CardService.WipLimitExceededException.class)
    public ResponseEntity<ErrorResponse> handleWipLimit(CardService.WipLimitExceededException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse("WIP_LIMIT_EXCEEDED", ex.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArg(IllegalArgumentException ex) {
        log.warn("Illegal argument: {}", ex.getMessage());
        return ResponseEntity.badRequest()
                .body(new ErrorResponse("BAD_REQUEST", ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex) {
        log.error("Unhandled exception: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred"));
    }
}