package org.game.pharaohcardgame.Service.Implementation;

import org.game.pharaohcardgame.Authentication.JwtService;
import org.game.pharaohcardgame.Exception.LockAcquisitionException;
import org.game.pharaohcardgame.Exception.LockInterruptedException;
import org.game.pharaohcardgame.Model.DTO.Request.UserInfoRequest;
import org.game.pharaohcardgame.Model.DTO.Response.UserCurrentStatus;
import org.game.pharaohcardgame.Model.DTO.ResponseMapper;
import org.game.pharaohcardgame.Model.User;
import org.game.pharaohcardgame.Repository.TokensRepository;
import org.game.pharaohcardgame.Repository.UserRepository;
import org.game.pharaohcardgame.Service.IAuthenticationService;
import org.game.pharaohcardgame.Service.ICacheService;
import org.game.pharaohcardgame.Service.IUserService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;


import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;



import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService implements IUserService {

	private final IAuthenticationService authenticationService;
	private final JwtService jwtService;
	private final TokensRepository tokensRepository;
	private final UserRepository userRepository;
	private final ResponseMapper responseMapper;
	private final CacheManager cacheManager;
	private final ICacheService cacheService;

	private final ConcurrentMap<String, ReentrantLock> locks = new ConcurrentHashMap<>();

	@Override
	@Transactional
	@Async
	public CompletableFuture<UserCurrentStatus> userStatus(UserInfoRequest userInfoRequest) {
		String LOG_PREFIX = "userStatus";


		try {
			String token = userInfoRequest.getToken();
			if (token == null || token.isBlank()) {
				log.warn("No token provided");
				return CompletableFuture.completedFuture(responseMapper.toUserCurrentStatus(null, false));
			}

			boolean isTokenValid = tokensRepository.findByToken(token)
					.map(t -> !t.isExpired() && !t.isRevoked())
					.orElse(false);

			if (!isTokenValid) {
				log.warn("Invalid or revoked token: {}", token);
				return CompletableFuture.completedFuture(responseMapper.toUserCurrentStatus(null, false));
			}

			Long userId = jwtService.getUserIdFromToken(token);
			if (userId == null) {
				log.warn("User id could not be extracted from token");
				return CompletableFuture.completedFuture(responseMapper.toUserCurrentStatus(null, false));
			}



			String cacheKey = String.format("userStatus_%d", userId);
			Cache cache = cacheManager.getCache("userStatus");

			// 1) gyors cache check
			UserCurrentStatus userCurrentStatus = cacheService.getCachedData(cache, cacheKey, LOG_PREFIX, UserCurrentStatus.class);
			if (userCurrentStatus != null) {
				return CompletableFuture.completedFuture(userCurrentStatus);
			}

			// 2) per-key lokális lock
			ReentrantLock lock = locks.computeIfAbsent(cacheKey, k -> new ReentrantLock());
			boolean locked = false;
			try {
				// várjunk max 10 másodpercet a lockra
				locked = lock.tryLock(10, TimeUnit.SECONDS);
				if (!locked) {
					throw new LockAcquisitionException("Failed to acquire lock");
				}

				// double-check: valaki más közben már feltöltötte a cache-t
				userCurrentStatus = cacheService.getCachedData(cache, cacheKey, LOG_PREFIX, UserCurrentStatus.class);
				if (userCurrentStatus != null) {
					return CompletableFuture.completedFuture(userCurrentStatus);
				}

				// lekérjük az adatbázisból, map-eljük és cache-eljuk
				User user = userRepository.findByIdWithRooms(userId)
						.orElseThrow(() -> new EntityNotFoundException("user not found"));

				userCurrentStatus = responseMapper.toUserCurrentStatus(user, true);

				cacheService.saveInCache(cache, cacheKey, userCurrentStatus, LOG_PREFIX);

				return CompletableFuture.completedFuture(userCurrentStatus);

			} catch (InterruptedException e) {
				Thread.currentThread().interrupt();
				throw new LockInterruptedException("Thread interrupted while acquiring lock", e);
			} finally {
				// ha a jelenlegi thread megszerezte a lockot, engedjük fel
				if (locked) {
					lock.unlock();
				}
				// cleanup: csak akkor távolítsuk el a lock objektumot, ha nincs lockolva és nincs váró szál
				// így csökkentjük annak esélyét, hogy eltávolítunk egy éppen használni készülő lockot
				if (!lock.isLocked() && !lock.hasQueuedThreads()) {
					locks.remove(cacheKey, lock);
				}
			}

		} catch (Exception e) {
			log.error("Unexpected error while reading user status", e);
			return CompletableFuture.completedFuture(responseMapper.toUserCurrentStatus(null, false));
		}
	}
}
