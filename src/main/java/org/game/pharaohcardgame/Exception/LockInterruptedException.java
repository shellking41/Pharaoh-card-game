package org.game.pharaohcardgame.Exception;

public class LockInterruptedException extends RuntimeException {
	public LockInterruptedException(String message, InterruptedException e) {
		super(message);
	}
}
