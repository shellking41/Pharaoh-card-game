package org.game.pharaohcardgame.Exception;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.game.pharaohcardgame.Model.DTO.Response.ErrorResponse;
import org.game.pharaohcardgame.Model.DTO.ResponseMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletionException;

@RestControllerAdvice
@Slf4j
@RequiredArgsConstructor
public class GlobalExceptionHandler {

	private final ResponseMapper responseMapper;

	// Custom Game Exceptions
	@ExceptionHandler(RoomNotFoundException.class)
	public ResponseEntity<ErrorResponse> handleRoomNotFoundException(RoomNotFoundException ex, WebRequest request) {
		log.warn("Room not found: {}", ex.getMessage());
		return createErrorResponse(HttpStatus.NOT_FOUND, "ROOM_NOT_FOUND", ex.getMessage());
	}

	@ExceptionHandler(GameSessionNotFoundException.class)
	public ResponseEntity<ErrorResponse> handleGameSessionNotFoundException(GameSessionNotFoundException ex, WebRequest request) {
		log.warn("Game session not found: {}", ex.getMessage());
		return createErrorResponse(HttpStatus.NOT_FOUND, "GAME_SESSION_NOT_FOUND", ex.getMessage());
	}

	@ExceptionHandler(PlayerNotFoundException.class)
	public ResponseEntity<ErrorResponse> handlePlayerNotFoundException(PlayerNotFoundException ex, WebRequest request) {
		log.warn("Player not found: {}", ex.getMessage());
		return createErrorResponse(HttpStatus.NOT_FOUND, "PLAYER_NOT_FOUND", ex.getMessage());
	}

	@ExceptionHandler(BotNotFoundException.class)
	public ResponseEntity<ErrorResponse> handleBotNotFoundException(BotNotFoundException ex, WebRequest request) {
		log.warn("Bot not found: {}", ex.getMessage());
		return createErrorResponse(HttpStatus.NOT_FOUND, "BOT_NOT_FOUND", ex.getMessage());
	}

	@ExceptionHandler(UserNotInRoomException.class)
	public ResponseEntity<ErrorResponse> handleUserNotInRoomException(UserNotInRoomException ex, WebRequest request) {
		log.warn("User not in room: {}", ex.getMessage());
		return createErrorResponse(HttpStatus.FORBIDDEN, "USER_NOT_IN_ROOM", ex.getMessage());
	}

	@ExceptionHandler(LockAcquisitionException.class)
	public ResponseEntity<ErrorResponse> handleLockAcquisitionException(LockAcquisitionException ex, WebRequest request) {
		log.error("Lock acquisition failed: {}", ex.getMessage());
		return createErrorResponse(HttpStatus.SERVICE_UNAVAILABLE, "LOCK_ACQUISITION_FAILED", "Service temporarily unavailable. Please try again.");
	}

	@ExceptionHandler(LockInterruptedException.class)
	public ResponseEntity<ErrorResponse> handleLockInterruptedException(LockInterruptedException ex, WebRequest request) {
		log.error("Lock interrupted: {}", ex.getMessage());
		return createErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "LOCK_INTERRUPTED", "Operation was interrupted. Please try again.");
	}

	// JPA/Hibernate Exceptions
	@ExceptionHandler(EntityNotFoundException.class)
	public ResponseEntity<ErrorResponse> handleEntityNotFoundException(EntityNotFoundException ex, WebRequest request) {
		log.warn("Entity not found: {}", ex.getMessage());
		return createErrorResponse(HttpStatus.NOT_FOUND, "ENTITY_NOT_FOUND", ex.getMessage());
	}

	// Security Exceptions
	@ExceptionHandler(AccessDeniedException.class)
	public ResponseEntity<ErrorResponse> handleAccessDeniedException(AccessDeniedException ex, WebRequest request) {
		log.warn("Access denied: {}", ex.getMessage());
		return createErrorResponse(HttpStatus.FORBIDDEN, "ACCESS_DENIED", ex.getMessage());
	}

	@ExceptionHandler(AuthenticationServiceException.class)
	public ResponseEntity<ErrorResponse> handleAuthenticationServiceException(AuthenticationServiceException ex, WebRequest request) {
		log.error("Authentication service error: {}", ex.getMessage());
		return createErrorResponse(HttpStatus.UNAUTHORIZED, "AUTHENTICATION_SERVICE_ERROR", ex.getMessage());
	}

	@ExceptionHandler(BadCredentialsException.class)
	public ResponseEntity<ErrorResponse> handleBadCredentialsException(BadCredentialsException ex, WebRequest request) {
		log.warn("Bad credentials: {}", ex.getMessage());
		return createErrorResponse(HttpStatus.UNAUTHORIZED, "BAD_CREDENTIALS", "Invalid username or password");
	}

	@ExceptionHandler(AuthenticationException.class)
	public ResponseEntity<ErrorResponse> handleAuthenticationException(AuthenticationException ex, WebRequest request) {
		log.warn("Authentication failed: {}", ex.getMessage());
		return createErrorResponse(HttpStatus.UNAUTHORIZED, "AUTHENTICATION_FAILED", "Authentication failed");
	}

	// Validation Exceptions
	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ErrorResponse> handleMethodArgumentNotValidException(MethodArgumentNotValidException ex, WebRequest request) {
		log.warn("Validation failed: {}", ex.getMessage());

		Map<String, String> errors = new HashMap<>();
		ex.getBindingResult().getAllErrors().forEach((error) -> {
			String fieldName = ((FieldError) error).getField();
			String errorMessage = error.getDefaultMessage();
			errors.put(fieldName, errorMessage);
		});

		return createErrorResponse(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Validation failed", errors);
	}

	@ExceptionHandler(ConstraintViolationException.class)
	public ResponseEntity<ErrorResponse> handleConstraintViolationException(ConstraintViolationException ex, WebRequest request) {
		log.warn("Constraint violation: {}", ex.getMessage());

		Map<String, String> errors = new HashMap<>();
		for (ConstraintViolation<?> violation : ex.getConstraintViolations()) {
			String propertyPath = violation.getPropertyPath().toString();
			String message = violation.getMessage();
			errors.put(propertyPath, message);
		}

		return createErrorResponse(HttpStatus.BAD_REQUEST, "CONSTRAINT_VIOLATION", "Constraint violation", errors);
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ResponseEntity<ErrorResponse> handleHttpMessageNotReadableException(HttpMessageNotReadableException ex, WebRequest request) {
		log.warn("Invalid JSON format: {}", ex.getMessage());
		return createErrorResponse(HttpStatus.BAD_REQUEST, "INVALID_JSON", "Invalid request format");
	}

	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	public ResponseEntity<ErrorResponse> handleMethodArgumentTypeMismatchException(MethodArgumentTypeMismatchException ex, WebRequest request) {
		log.warn("Type mismatch for parameter {}: {}", ex.getName(), ex.getMessage());
		String message = String.format("Invalid value for parameter '%s'. Expected type: %s",
				ex.getName(), ex.getRequiredType().getSimpleName());
		return createErrorResponse(HttpStatus.BAD_REQUEST, "TYPE_MISMATCH", message);
	}

	// Standard Java Exceptions
	@ExceptionHandler(IllegalArgumentException.class)
	public ResponseEntity<ErrorResponse> handleIllegalArgumentException(IllegalArgumentException ex, WebRequest request) {
		log.warn("Illegal argument: {}", ex.getMessage());
		return createErrorResponse(HttpStatus.BAD_REQUEST, "ILLEGAL_ARGUMENT", ex.getMessage());
	}

	@ExceptionHandler(IllegalStateException.class)
	public ResponseEntity<ErrorResponse> handleIllegalStateException(IllegalStateException ex, WebRequest request) {
		log.warn("Illegal state: {}", ex.getMessage());
		return createErrorResponse(HttpStatus.CONFLICT, "ILLEGAL_STATE", ex.getMessage());
	}

	@ExceptionHandler(NullPointerException.class)
	public ResponseEntity<ErrorResponse> handleNullPointerException(NullPointerException ex, WebRequest request) {
		log.error("Null pointer exception occurred", ex);
		return createErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "NULL_POINTER", "An unexpected error occurred");
	}

	// Async/CompletableFuture Exceptions
	@ExceptionHandler(CompletionException.class)
	public ResponseEntity<ErrorResponse> handleCompletionException(CompletionException ex, WebRequest request) {
		log.error("Completion exception: {}", ex.getMessage(), ex);

		// Unwrap the actual cause
		Throwable cause = ex.getCause();
		if (cause != null) {
			// Recursively handle the underlying exception
			if (cause instanceof RuntimeException) {
				return handleRuntimeException((RuntimeException) cause, request);
			}
		}

		return createErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "ASYNC_OPERATION_FAILED", "Asynchronous operation failed");
	}

	// Runtime Exception (catch-all for other runtime exceptions)
	@ExceptionHandler(RuntimeException.class)
	public ResponseEntity<ErrorResponse> handleRuntimeException(RuntimeException ex, WebRequest request) {
		log.error("Runtime exception occurred: {}", ex.getMessage(), ex);
		return createErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "RUNTIME_ERROR", "An unexpected error occurred");
	}

	// General Exception (catch-all)
	@ExceptionHandler(Exception.class)
	public ResponseEntity<ErrorResponse> handleGeneralException(Exception ex, WebRequest request) {
		log.error("Unexpected exception occurred: {}", ex.getMessage(), ex);
		return createErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "An unexpected error occurred");
	}

	// Helper methods
	private ResponseEntity<ErrorResponse> createErrorResponse(HttpStatus status, String errorCode, String message) {
		return createErrorResponse(status, errorCode, message, null);
	}

	private ResponseEntity<ErrorResponse> createErrorResponse(HttpStatus status, String errorCode, String message, Map<String, String> validationErrors) {
		ErrorResponse errorResponse = ErrorResponse.builder()
				.success(false)
				.errorCode(errorCode)
				.message(message)
				.status(status.value())
				.validationErrors(validationErrors)
				.timestamp(System.currentTimeMillis())
				.build();

		return ResponseEntity.status(status).body(errorResponse);
	}
}
