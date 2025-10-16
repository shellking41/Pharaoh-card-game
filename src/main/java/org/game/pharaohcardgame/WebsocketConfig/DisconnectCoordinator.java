package org.game.pharaohcardgame.WebsocketConfig;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

@Slf4j
@Component
public class DisconnectCoordinator {
	private final ThreadPoolTaskScheduler scheduler;
	private final Map<Long, ScheduledFuture<?>> pending = new ConcurrentHashMap<>();
	private final long gracePeriodMillis = 30_000L;

	public DisconnectCoordinator(@Qualifier("disconnectTaskScheduler") ThreadPoolTaskScheduler scheduler) {
		this.scheduler = scheduler;
	}

	public void scheduleDisconnect(Long userId, Runnable disconnectAction) {
		cancelDisconnect(userId);

		Instant startTime = Instant.now().plusMillis(gracePeriodMillis);
		ScheduledFuture<?> future = scheduler.schedule(disconnectAction, startTime);

		pending.put(userId, future);
		log.debug("Scheduled disconnect for user {} in {}ms", userId, gracePeriodMillis);
	}

	public boolean cancelDisconnect(Long userId) {
		ScheduledFuture<?> fut = pending.remove(userId);
		if (fut != null) {
			boolean cancelled = fut.cancel(false);
			log.debug("Cancelled disconnect for user {}: {}", userId, cancelled);
			return cancelled;
		}
		return false;
	}

	public boolean hasPending(Long userId) {
		return pending.containsKey(userId);
	}
}